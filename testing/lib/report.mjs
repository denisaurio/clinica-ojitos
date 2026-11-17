import { MODULOS } from './module-map.mjs';
import { ms } from './util.mjs';

const soportaColor = !process.env.NO_COLOR && process.stdout.isTTY !== false;
const pintar = (codigo) => (texto) => (soportaColor ? `\u001b[${codigo}m${texto}\u001b[0m` : String(texto));

const rojo = pintar('31');
const verde = pintar('32');
const amarillo = pintar('33');
const gris = pintar('90');
const negrita = pintar('1');
const cian = pintar('36');

function linea(caracter = '─', largo = 78) {
  return gris(caracter.repeat(largo));
}

function ancho(texto, largo) {
  return String(texto).padEnd(largo, ' ');
}

export function imprimirCabecera(configuracion) {
  console.log('');
  console.log(negrita('  Clínica Oftalmológica Ojitos — suite de pruebas por módulo'));
  console.log(linea('═'));
  console.log(`  API:         ${cian(configuracion.baseUrl)}`);
  console.log(`  Modo:        ${configuracion.modo}`);
  console.log(`  Escrituras:  ${configuracion.escrituras}`);
  console.log(`  Tiempo máx:  ${configuracion.timeout}`);
  console.log(linea());
}

export function imprimirTabla(resultados) {
  console.log('');
  console.log(negrita('  Resultados por módulo'));
  console.log(linea());
  console.log(
    `  ${ancho('MÓDULO', 20)}${ancho('TIEMPO', 12)}${ancho('PRUEBAS', 12)}ESTADO`
  );
  console.log(linea());

  for (const resultado of resultados) {
    const total = resultado.pruebas.length;
    const fallos = resultado.pruebas.filter((p) => p.ok === false).length;
    const omitidas = resultado.pruebas.filter((p) => p.omitida).length;
    const aprobadas = total - fallos - omitidas;

    let estado;
    if (resultado.omitido) {
      estado = amarillo(`OMITIDO — ${resultado.omitido}`);
    } else if (fallos > 0) {
      estado = rojo(`FALLOS (${fallos})`);
    } else if (omitidas > 0) {
      estado = amarillo(`PARCIAL (${omitidas} omitidas)`);
    } else {
      estado = verde('OK');
    }

    console.log(
      `  ${ancho(resultado.nombre, 20)}${ancho(ms(resultado.ms), 12)}${ancho(
        resultado.omitido ? '—' : `${aprobadas}/${total}`,
        12
      )}${estado}`
    );
  }
  console.log(linea());
}

export function imprimirFallos(resultados) {
  const conFallos = resultados.filter((r) => r.pruebas.some((p) => p.ok === false));
  if (conFallos.length === 0) {
    return;
  }

  console.log('');
  console.log(rojo(negrita('  Fallos detectados')));
  console.log(linea());

  for (const resultado of conFallos) {
    console.log(rojo(`  ${resultado.nombre}`));
    for (const prueba of resultado.pruebas.filter((p) => p.ok === false)) {
      console.log(rojo(`    ✗ ${prueba.nombre} (${ms(prueba.ms)})`));
      const mensaje = prueba.error?.message ?? String(prueba.error);
      console.log(rojo(`      ${mensaje}`));
    }
  }
  console.log(linea());
}

export function imprimirRelaciones() {
  console.log('');
  console.log(negrita('  Mapa de relaciones entre módulos'));
  console.log(linea());
  for (const modulo of MODULOS) {
    const relaciones = modulo.relaciones.length ? modulo.relaciones.join(', ') : '—';
    console.log(`  ${cian(ancho(modulo.nombre, 18))} → ${relaciones}`);
  }
  console.log(linea());
}

export function imprimirResumen(resultados) {
  const pruebas = resultados.flatMap((r) => r.pruebas);
  const fallos = pruebas.filter((p) => p.ok === false).length;
  const omitidas = pruebas.filter((p) => p.omitida).length;
  const modulosOmitidos = resultados.filter((r) => r.omitido).length;
  const aprobadas = pruebas.length - fallos - omitidas;
  const totalMs = resultados.reduce((suma, r) => suma + r.ms, 0);
  const detalleOmitidos = modulosOmitidos > 0
    ? ` · ${modulosOmitidos} módulo(s) omitido(s)`
    : '';

  console.log('');
  if (fallos > 0) {
    console.log(
      rojo(
        negrita(
          `  ✗ ${fallos} prueba(s) fallaron · ${aprobadas} aprobadas · ${omitidas} omitidas${detalleOmitidos} · ${ms(totalMs)}`
        )
      )
    );
  } else if (omitidas > 0 || modulosOmitidos > 0) {
    console.log(
      amarillo(
        negrita(
          `  ! ${aprobadas} prueba(s) aprobadas · ${omitidas} omitidas${detalleOmitidos} · ${ms(totalMs)}`
        )
      )
    );
  } else {
    console.log(
      verde(negrita(`  ✓ ${aprobadas} prueba(s) aprobadas · ${ms(totalMs)}`))
    );
  }
  console.log('');
}

export function codigoDeSalida(resultados) {
  return resultados.some((r) => r.pruebas.some((p) => p.ok === false)) ? 1 : 0;
}
