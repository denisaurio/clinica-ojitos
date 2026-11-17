import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const aqui = path.dirname(fileURLToPath(import.meta.url));

/** Raíz del monorepo (dos niveles por encima de `testing/lib`). */
export const raizRepo = path.resolve(aqui, '..', '..');

/**
 * Lee un `.env` sin dependencias externas. Las variables del proceso tienen
 * prioridad sobre el archivo, de modo que CI o Coolify pueden sobrescribirlas.
 */
function leerArchivoEnv(ruta) {
  const valores = new Map();
  if (!existsSync(ruta)) {
    return valores;
  }
  for (const linea of readFileSync(ruta, 'utf8').split(/\r?\n/)) {
    const limpia = linea.trim();
    if (!limpia || limpia.startsWith('#')) {
      continue;
    }
    const separador = limpia.indexOf('=');
    if (separador < 1) {
      continue;
    }
    const clave = limpia.slice(0, separador).trim();
    let valor = limpia.slice(separador + 1).trim();
    if (
      (valor.startsWith('"') && valor.endsWith('"')) ||
      (valor.startsWith("'") && valor.endsWith("'"))
    ) {
      valor = valor.slice(1, -1);
    }
    valores.set(clave, valor);
  }
  return valores;
}

const desdeArchivo = leerArchivoEnv(path.join(raizRepo, '.env'));

function valor(clave, porDefecto = '') {
  const delProceso = process.env[clave];
  if (delProceso !== undefined) {
    return delProceso;
  }
  return desdeArchivo.get(clave) ?? porDefecto;
}

function booleano(clave, porDefecto) {
  const texto = String(valor(clave, porDefecto ? 'true' : 'false')).toLowerCase();
  return ['true', '1', 'si', 'sí', 'yes'].includes(texto);
}

const puerto = valor('SERVER_PORT', '8080');
const urlPorDefecto = `http://localhost:${puerto}/api/v1`;

export const config = {
  raizRepo,
  baseUrl: String(valor('TEST_BASE_URL', urlPorDefecto)).replace(/\/$/, ''),
  timeoutMs: Number(valor('TEST_TIMEOUT_MS', '15000')),
  /** `auto` ejecuta contrato + integración; `contract` solo lectura offline. */
  modo: String(valor('TEST_MODE', 'auto')).toLowerCase(),
  /** Las pruebas de escritura crean datos con prefijo TEST y limpian al final. */
  escribir: booleano('TEST_WRITES', true),
  credenciales: {
    admin: {
      username: valor('TEST_ADMIN_USER', 'admin'),
      password: valor('TEST_ADMIN_PASSWORD', 'admin123'),
    },
    oftalmologo: {
      username: valor('TEST_DOCTOR_USER', 'dra.rostova'),
      password: valor('TEST_DOCTOR_PASSWORD', 'Ojitos2026*'),
    },
    paciente: {
      username: valor('TEST_PATIENT_USER', ''),
      password: valor('TEST_PATIENT_PASSWORD', ''),
    },
  },
};

export function describirConfiguracion() {
  return {
    baseUrl: config.baseUrl,
    modo: config.modo,
    escrituras: config.escribir ? 'sí (datos TEST con limpieza)' : 'no',
    timeout: `${config.timeoutMs} ms`,
  };
}
