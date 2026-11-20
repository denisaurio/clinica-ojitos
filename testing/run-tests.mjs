#!/usr/bin/env node
// =============================================================================
//  Runner de pruebas por módulo — Clínica Ojitos
//
//  Uso (desde la raíz del repo):
//    node testing/run-tests.mjs                  todo: backend + build del frontend
//    node testing/run-tests.mjs --modulo citas   solo un módulo (acepta varios: --modulo citas,auth)
//    node testing/run-tests.mjs --sin-frontend   omite el build de Angular
//    node testing/run-tests.mjs --solo-reporte   no ejecuta nada: re-lee backend/target/surefire-reports
//    node testing/run-tests.mjs --reportes DIR   lee los XML de surefire de otra carpeta
//
//  Genera: testing/reporte/index.html  y  testing/reporte/resultados.json
//  Código de salida: 0 si todo está en verde, 1 si algún módulo falla.
// =============================================================================
import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const AQUI = dirname(fileURLToPath(import.meta.url));
const RAIZ = resolve(AQUI, '..');
const BACKEND = join(RAIZ, 'backend');
const FRONTEND = join(RAIZ, 'frontend');
const SALIDA = join(AQUI, 'reporte');
const esWin = process.platform === 'win32';

// ---- argumentos --------------------------------------------------------------
const args = process.argv.slice(2);
const flag = (n) => args.includes(n);
const valor = (n) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : null; };
const soloReporte = flag('--solo-reporte');
const sinFrontend = flag('--sin-frontend') || !!valor('--modulo') || soloReporte;
const filtro = valor('--modulo')?.split(',').map((s) => s.trim());
const dirReportes = valor('--reportes') ?? join(BACKEND, 'target', 'surefire-reports');

// ---- colores de consola ----------------------------------------------------------
const c = (n, t) => (process.stdout.isTTY || process.env.FORCE_COLOR ? `\x1b[${n}m${t}\x1b[0m` : t);
const rojo = (t) => c(31, t), verde = (t) => c(32, t), ambar = (t) => c(33, t), gris = (t) => c(90, t), neg = (t) => c(1, t);

const mapa = JSON.parse(readFileSync(join(AQUI, 'modulos.json'), 'utf8'));
let modulos = mapa.modulos;
if (filtro) {
  const ids = new Set(modulos.map((m) => m.id));
  const malos = filtro.filter((f) => !ids.has(f));
  if (malos.length) { console.error(rojo(`Módulo desconocido: ${malos.join(', ')}. Opciones: ${[...ids].join(', ')}`)); process.exit(2); }
}
const seleccion = filtro ? modulos.filter((m) => filtro.includes(m.id)) : modulos;

// ---- 1) ejecutar el backend ----------------------------------------------------
let backendSalida = { codigo: 0, ms: 0, log: '' };
if (!soloReporte) {
  if (existsSync(dirReportes)) rmSync(dirReportes, { recursive: true, force: true });
  const clases = [...new Set(seleccion.flatMap((m) => m.tests))].join(',');
  // Ruta absoluta: en Windows, cmd.exe no siempre busca en la carpeta actual
  // ("mvnw.cmd no se reconoce como un comando interno o externo").
  const wrapper = esWin ? `"${join(BACKEND, 'mvnw.cmd')}"` : './mvnw';
  console.log(neg(`\n▶ Backend: ${wrapper} test  (${seleccion.length} módulo/s)\n`));
  const t0 = Date.now();
  const r = spawnSync(wrapper, ['-B', 'test', `-Dtest=${clases}`, '-Dsurefire.failIfNoSpecifiedTests=false'],
    { cwd: BACKEND, shell: esWin, encoding: 'utf8', maxBuffer: 1 << 28 });
  backendSalida = { codigo: r.status ?? 1, ms: Date.now() - t0, log: (r.stdout ?? '') + (r.stderr ?? '') };
  if (r.error) console.error(rojo(`No se pudo ejecutar Maven: ${r.error.message}`));
}

// ---- 2) leer los XML de surefire -------------------------------------------------
const dec = (s) => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&');
const atributo = (txt, n) => { const m = txt.match(new RegExp(`\\b${n}="([^"]*)"`)); return m ? dec(m[1]) : ''; };

function leerCasos() {
  const casos = [];
  if (!existsSync(dirReportes)) return casos;
  for (const f of readdirSync(dirReportes).filter((x) => /^TEST-.*\.xml$/.test(x))) {
    const xml = readFileSync(join(dirReportes, f), 'utf8');
    const re = /<testcase\b([^>]*?)(?:\/>|>([\s\S]*?)<\/testcase>)/g;
    let m;
    while ((m = re.exec(xml))) {
      const cuerpo = m[2] ?? '';
      const claseCompleta = atributo(m[1], 'classname');
      const fallo = cuerpo.match(/<(failure|error)\b([^>]*)>/);
      const salto = /<skipped\b/.test(cuerpo);
      casos.push({
        clase: claseCompleta.split('.').pop().split('$')[0],
        nombre: atributo(m[1], 'name'),
        ms: Math.round(parseFloat(atributo(m[1], 'time') || '0') * 1000),
        estado: fallo ? 'fallo' : salto ? 'omitido' : 'ok',
        mensaje: fallo ? atributo(fallo[2], 'message').split('\n')[0].slice(0, 300) : '',
      });
    }
  }
  return casos;
}
const casos = leerCasos();

// ---- 3) agrupar por módulo ---------------------------------------------------------
const resultados = seleccion.map((m) => {
  const propios = casos.filter((x) => m.tests.includes(x.clase));
  const fallos = propios.filter((x) => x.estado === 'fallo');
  const estado = propios.length === 0 ? 'sin-datos' : fallos.length ? 'rojo' : 'verde';
  return { ...m, casos: propios, fallos, ms: propios.reduce((a, x) => a + x.ms, 0), estado };
});
const estadoDe = Object.fromEntries(resultados.map((r) => [r.id, r.estado]));
for (const r of resultados) {
  r.posiblesCausas = r.estado === 'rojo' ? r.depende.filter((d) => estadoDe[d] === 'rojo') : [];
  r.usadoPor = modulos.filter((o) => o.depende.includes(r.id)).map((o) => o.id);
}

// Diagnóstico global: si TODAS las pruebas de API fallan, lo habitual es que el contexto no arranque.
const api = casos.filter((x) => x.clase.endsWith('ApiTest'));
const contextoCaido = api.length > 0 && api.every((x) => x.estado === 'fallo');
const sinReportes = casos.length === 0 && !soloReporte;

// ---- 4) frontend (prueba de humo: que compile) -----------------------------------------
let front = null;
if (!sinFrontend) {
  console.log(neg('\n▶ Frontend: npm run build (producción)\n'));
  const t0 = Date.now();
  const npm = esWin ? 'npm.cmd' : 'npm';
  const r = spawnSync(npm, mapa.frontend.comando.slice(1), { cwd: FRONTEND, shell: esWin, encoding: 'utf8', maxBuffer: 1 << 28 });
  const ok = r.status === 0;
  front = { id: 'frontend', nombre: mapa.frontend.nombre, depende: [], usadoPor: [], estado: ok ? 'verde' : 'rojo',
            ms: Date.now() - t0, casos: [{ clase: 'ng build', nombre: 'compilación de producción', ms: Date.now() - t0,
            estado: ok ? 'ok' : 'fallo', mensaje: ok ? '' : ((r.stdout ?? '') + (r.stderr ?? '')).split('\n').filter((l) => /error/i.test(l)).slice(0, 3).join(' | ').slice(0, 300) }],
            fallos: [], posiblesCausas: [] };
  front.fallos = front.casos.filter((x) => x.estado === 'fallo');
  resultados.push(front);
}

// ---- 5) consola ----------------------------------------------------------------------------
const icono = { verde: verde('🟢 VERDE   '), rojo: rojo('🔴 ROJO    '), 'sin-datos': ambar('⚪ SIN DATOS') };
console.log(neg('\n══════════ RESULTADO POR MÓDULO ══════════\n'));
for (const r of resultados) {
  const ok = r.casos.filter((x) => x.estado === 'ok').length;
  console.log(`${icono[r.estado]} ${r.nombre.padEnd(30)} ${gris(`${ok}/${r.casos.length} pruebas · ${r.ms} ms`)}`);
  if (r.depende.length) console.log(gris(`              depende de: ${r.depende.join(', ')}`));
  for (const f of r.fallos) console.log(rojo(`              ✖ ${f.clase} › ${f.nombre}: ${f.mensaje}`));
  if (r.posiblesCausas.length) console.log(ambar(`              ⚠ posible causa: falla también ${r.posiblesCausas.join(', ')}`));
}
if (contextoCaido) console.log(ambar('\n⚠ TODAS las pruebas de API fallan: lo más probable es que la aplicación Spring no arranque con H2.\n  Revisa la primera excepción en backend/target/surefire-reports/*.txt (entidad, bean o SQL).'));
if (sinReportes) console.log(rojo(`\n✖ No se generó ningún reporte de pruebas (${dirReportes}).\n  Probablemente Maven no compiló o no pudo descargar dependencias. Últimas líneas:\n`) + gris(backendSalida.log.split('\n').slice(-25).join('\n')));

const rojos = resultados.filter((r) => r.estado === 'rojo').length;
const total = casos.length + (front ? 1 : 0);
console.log(`\n${rojos ? rojo('✖ HAY MÓDULOS EN ROJO') : sinReportes ? rojo('✖ SIN RESULTADOS') : verde('✔ TODO EN VERDE')}  ${gris(`· ${total} pruebas · backend ${backendSalida.ms} ms`)}\n`);

// ---- 6) reporte HTML + JSON -------------------------------------------------------------------
mkdirSync(SALIDA, { recursive: true });
const generado = new Date().toLocaleString('es-PE', { timeZone: 'America/Lima' });
writeFileSync(join(SALIDA, 'resultados.json'), JSON.stringify({ generado, resultados }, null, 2));
const esc = (s) => String(s).replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));
const etiqueta = { verde: 'VERDE', rojo: 'ROJO', 'sin-datos': 'SIN DATOS' };
const tarjetas = resultados.map((r) => `
  <section class="card ${r.estado}">
    <header><h2>${esc(r.nombre)}</h2><span class="tag">${etiqueta[r.estado]}</span></header>
    <p class="meta">${r.rf && r.rf !== '—' ? esc(r.rf) + ' · ' : ''}${r.casos.filter((x) => x.estado === 'ok').length}/${r.casos.length} pruebas · <b>${r.ms} ms</b></p>
    <p class="rel">Depende de: ${r.depende.length ? r.depende.map(esc).join(', ') : '—'}<br>Lo usan: ${r.usadoPor.length ? r.usadoPor.map(esc).join(', ') : '—'}</p>
    ${r.posiblesCausas.length ? `<p class="causa">⚠ Posible causa: ${r.posiblesCausas.map(esc).join(', ')} también falla</p>` : ''}
    <ul>${r.casos.map((x) => `<li class="${x.estado}"><span>${x.estado === 'ok' ? '✔' : x.estado === 'fallo' ? '✖' : '–'}</span> ${esc(x.clase)} › ${esc(x.nombre)} <em>${x.ms} ms</em>${x.mensaje ? `<div class="msg">${esc(x.mensaje)}</div>` : ''}</li>`).join('')}</ul>
  </section>`).join('');
writeFileSync(join(SALIDA, 'index.html'), `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Reporte de pruebas · Clínica Ojitos</title>
<style>
:root{--bg:#f8fafc;--fg:#0f172a;--card:#fff;--borde:#e2e8f0;--ok:#16a34a;--ko:#dc2626;--nd:#d97706;--mut:#64748b}
@media (prefers-color-scheme:dark){:root{--bg:#0b1220;--fg:#e2e8f0;--card:#111a2e;--borde:#22304a;--mut:#94a3b8}}
body{margin:0;padding:24px;font:14px/1.5 system-ui,sans-serif;background:var(--bg);color:var(--fg)}
h1{margin:0 0 4px}.sub{color:var(--mut);margin:0 0 20px}
.grid{display:grid;gap:14px;grid-template-columns:repeat(auto-fill,minmax(340px,1fr))}
.card{background:var(--card);border:1px solid var(--borde);border-left:6px solid var(--nd);border-radius:10px;padding:14px}
.card.verde{border-left-color:var(--ok)}.card.rojo{border-left-color:var(--ko)}
header{display:flex;justify-content:space-between;align-items:center}h2{font-size:16px;margin:0}
.tag{font-size:11px;font-weight:700;padding:2px 8px;border-radius:99px;color:#fff;background:var(--nd)}
.verde .tag{background:var(--ok)}.rojo .tag{background:var(--ko)}
.meta,.rel{color:var(--mut);margin:6px 0}.causa{color:var(--nd);font-weight:600}
ul{list-style:none;padding:0;margin:8px 0 0}li{padding:3px 0;border-top:1px solid var(--borde)}
li span{display:inline-block;width:16px;font-weight:700}li.ok span{color:var(--ok)}li.fallo span{color:var(--ko)}
li em{float:right;color:var(--mut);font-style:normal}.msg{color:var(--ko);font-size:12px;margin-left:16px;word-break:break-word}
</style></head><body>
<h1>Reporte de pruebas por módulo</h1>
<p class="sub">Generado ${esc(generado)} · ${total} pruebas · ${rojos ? `<b style="color:var(--ko)">${rojos} módulo(s) en rojo</b>` : '<b style="color:var(--ok)">todo en verde</b>'}</p>
<div class="grid">${tarjetas}</div></body></html>`);
console.log(gris(`Reporte: ${join('testing', 'reporte', 'index.html')}\n`));
process.exit(rojos || sinReportes ? 1 : 0);
