import { parsearJson } from './util.mjs';

/** Marca una prueba como omitida sin contarla como fallo. */
export class PruebaOmitida extends Error {
  constructor(motivo) {
    super(motivo);
    this.name = 'PruebaOmitida';
  }
}

/** Lanza una omisión con un motivo legible. */
export function omitir(motivo) {
  throw new PruebaOmitida(motivo);
}

/** Falla con un mensaje legible cuando la condición no se cumple. */
export function asegurar(condicion, mensaje) {
  if (!condicion) {
    throw new Error(mensaje);
  }
}

export function igual(real, esperado, mensaje) {
  asegurar(
    Object.is(real, esperado),
    `${mensaje}: se esperaba ${JSON.stringify(esperado)} y llegó ${JSON.stringify(real)}`
  );
}

export function distinto(real, esperado, mensaje) {
  asegurar(
    !Object.is(real, esperado),
    `${mensaje}: no debía ser ${JSON.stringify(esperado)}`
  );
}

export function esArreglo(valor, mensaje) {
  asegurar(Array.isArray(valor), `${mensaje}: se esperaba una lista y llegó ${tipoDe(valor)}`);
  return valor;
}

export function esObjeto(valor, mensaje) {
  asegurar(
    valor !== null && typeof valor === 'object' && !Array.isArray(valor),
    `${mensaje}: se esperaba un objeto y llegó ${tipoDe(valor)}`
  );
  return valor;
}

export function esNumero(valor, mensaje) {
  asegurar(
    typeof valor === 'number' && Number.isFinite(valor),
    `${mensaje}: se esperaba un número y llegó ${tipoDe(valor)}`
  );
  return valor;
}

export function esTexto(valor, mensaje) {
  asegurar(typeof valor === 'string' && valor.length > 0, `${mensaje}: se esperaba texto`);
  return valor;
}

/** Comprueba que el objeto tenga todos los campos (aunque valgan `null`). */
export function tieneCampos(objeto, campos, mensaje) {
  esObjeto(objeto, mensaje);
  const faltantes = campos.filter((campo) => !(campo in objeto));
  asegurar(
    faltantes.length === 0,
    `${mensaje}: faltan los campos ${faltantes.join(', ')}`
  );
  return objeto;
}

export function incluye(lista, predicado, mensaje) {
  esArreglo(lista, mensaje);
  asegurar(lista.some(predicado), mensaje);
  return lista;
}

/** Ejecuta una comprobación con timeout propio (no deja promesas colgadas). */
export async function conTimeout(promesa, ms, mensaje) {
  let temporizador;
  const limite = new Promise((_, rechazar) => {
    temporizador = setTimeout(() => rechazar(new Error(`${mensaje} (${ms} ms)`)), ms);
  });
  try {
    return await Promise.race([promesa, limite]);
  } finally {
    clearTimeout(temporizador);
  }
}

export function resumirCuerpo(cuerpo) {
  return parsearJson(cuerpo);
}

function tipoDe(valor) {
  if (valor === null) return 'null';
  if (Array.isArray(valor)) return 'lista';
  return typeof valor;
}
