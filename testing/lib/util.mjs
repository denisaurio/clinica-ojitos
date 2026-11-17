/** Utilidades sin dependencias compartidas por el runner. */

export function parsearJson(valor) {
  if (typeof valor !== 'string') {
    return valor;
  }
  try {
    return JSON.parse(valor);
  } catch {
    return valor;
  }
}

/** Fecha local en formato ISO `YYYY-MM-DD`. */
export function fechaIso(fecha = new Date()) {
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  const dia = String(fecha.getDate()).padStart(2, '0');
  return `${fecha.getFullYear()}-${mes}-${dia}`;
}

export function sumarDias(fecha, dias) {
  const copia = new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate());
  copia.setDate(copia.getDate() + dias);
  return copia;
}

/** Marca única para los datos de prueba: `TEST-20261116-041500`. */
export function marcaDePrueba() {
  const ahora = new Date();
  const hora = [ahora.getHours(), ahora.getMinutes(), ahora.getSeconds()]
    .map((n) => String(n).padStart(2, '0'))
    .join('');
  return `TEST-${fechaIso(ahora).replaceAll('-', '')}-${hora}`;
}

/** Formatea milisegundos con una decimal, para la tabla del informe. */
export function ms(valor) {
  return `${valor.toFixed(1)} ms`;
}
