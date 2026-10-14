// Renombra `type` -> `tipo` en los atributos de <ui-button>.
// El componente declara `readonly tipo = input(...)`, por lo que escribir
// `type="submit"` no enlazaba nada: el <button> interno quedaba en
// type="button" y nunca se disparaba el (ngSubmit) del formulario.
const fs = require('fs');
const path = require('path');

const RAIZ = 'C:/Users/Admin/Desktop/Clinica Ojitos/frontend/src';

function recorrer(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    return e.isDirectory() ? recorrer(p) : [p];
  });
}

let corregidos = 0;
const detalles = [];

for (const archivo of recorrer(RAIZ).filter((f) => f.endsWith('.html'))) {
  let texto = fs.readFileSync(archivo, 'utf8');
  const original = texto;

  // Localiza cada etiqueta <ui-button ...> (puede ocupar varias lineas)
  texto = texto.replace(/<ui-button\b[\s\S]*?>/g, (etiqueta) => {
    if (!/\btype\s*=\s*"(submit|button|reset)"/.test(etiqueta)) return etiqueta;
    const nueva = etiqueta.replace(/\btype(\s*=\s*")(submit|button|reset)"/g, 'tipo$1$2"');
    const rel = path.relative(RAIZ, archivo);
    detalles.push(`  ${rel}: type -> tipo (${nueva.match(/tipo="(\w+)"/)[1]})`);
    corregidos++;
    return nueva;
  });

  if (texto !== original) fs.writeFileSync(archivo, texto, 'utf8');
}

console.log(`Etiquetas corregidas: ${corregidos}`);
console.log(detalles.join('\n'));

// Verificacion: no debe quedar ningun type= dentro de un <ui-button>
let restos = 0;
for (const archivo of recorrer(RAIZ).filter((f) => f.endsWith('.html'))) {
  const texto = fs.readFileSync(archivo, 'utf8');
  const malas = texto.match(/<ui-button\b[\s\S]*?\btype\s*=\s*"(submit|button)"/g);
  if (malas) {
    restos += malas.length;
    console.log(`  RESTO en ${path.relative(RAIZ, archivo)}: ${malas.length}`);
  }
}
console.log(restos === 0 ? 'Verificado: 0 restos' : `ATENCION: ${restos} restos`);