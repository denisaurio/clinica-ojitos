#!/usr/bin/env node
/**
 * Runner de la suite de pruebas por módulo.
 *
 * Uso:
 *   node testing/run.mjs
 *   TEST_MODE=contract node testing/run.mjs
 *
 * Sin dependencias externas: solo Node 18+ (fetch nativo).
 */
import { config, describirConfiguracion } from './lib/config.mjs';
import { crearCliente } from './lib/http.mjs';
import { PruebaOmitida, omitir } from './lib/assert.mjs';
import { moduloPorNombre } from './lib/module-map.mjs';
import {
  imprimirCabecera,
  imprimirTabla,
  imprimirFallos,
  imprimirRelaciones,
  imprimirResumen,
  codigoDeSalida,
} from './lib/report.mjs';

import contrato from './contract/contrato-api.test.mjs';
import auth from './modules/auth.test.mjs';
import catalogo from './modules/catalogo.test.mjs';
import estado from './modules/estado.test.mjs';
import pacientes from './modules/pacientes.test.mjs';
import oftalmologos from './modules/oftalmologos.test.mjs';
import historial from './modules/historial.test.mjs';
import citas from './modules/citas.test.mjs';
import tratamientos from './modules/tratamientos.test.mjs';
import dashboards from './modules/dashboards.test.mjs';
import admin from './modules/admin.test.mjs';
import seguridad from './modules/seguridad.test.mjs';
import flujoCompleto from './relations/flujo-completo.test.mjs';

/** Orden de ejecución: el contrato no toca la red y los demás comparten datos. */
const ORDEN = [
  contrato,
  estado,
  auth,
  catalogo,
  pacientes,
  oftalmologos,
  historial,
  citas,
  tratamientos,
  dashboards,
  admin,
  seguridad,
  flujoCompleto,
];

function crearContexto() {
  const datos = {};
  const limpieza = [];
  return {
    datos,
    limpieza,
    registrarLimpieza(descripcion, ejecutar) {
      limpieza.push({ descripcion, ejecutar });
    },
    exigirSesion() {
      if (!datos.sesion) {
        omitir('requiere una sesión de administrador y el login falló');
      }
      return datos.sesion;
    },
    exigirPaciente() {
      if (!datos.paciente) {
        omitir('requiere el paciente TEST creado por el módulo de pacientes');
      }
      return datos.paciente;
    },
    exigirOftalmologo() {
      if (!datos.oftalmologo) {
        omitir('requiere un oftalmólogo activo con horarios cargados');
      }
      return datos.oftalmologo;
    },
    exigirCita() {
      if (!datos.cita) {
        omitir('requiere la cita TEST creada por el módulo de citas');
      }
      return datos.cita;
    },
    exigirTratamiento() {
      if (!datos.tratamiento) {
        omitir('requiere el tratamiento TEST creado por su módulo');
      }
      return datos.tratamiento;
    },
  };
}

async function ejecutarModulo(definicion, contexto, cliente) {
  const inicio = performance.now();
  const pruebas = [];

  const prueba = async (nombre, accion) => {
    const t0 = performance.now();
    try {
      await accion();
      pruebas.push({ nombre, ok: true, ms: performance.now() - t0 });
    } catch (error) {
      const duracion = performance.now() - t0;
      if (error instanceof PruebaOmitida) {
        pruebas.push({ nombre, omitida: true, motivo: error.message, ms: duracion });
      } else {
        pruebas.push({ nombre, ok: false, ms: duracion, error });
      }
    }
  };

  try {
    await definicion.ejecutar({ prueba, ctx: contexto, cliente, config });
  } catch (error) {
    pruebas.push({ nombre: 'Ejecución del módulo', ok: false, ms: 0, error });
  }

  return {
    nombre: definicion.nombre,
    ms: performance.now() - inicio,
    pruebas,
  };
}

function moduloOmitido(nombre, motivo) {
  return { nombre, ms: 0, pruebas: [], omitido: motivo };
}

/** Comprueba que la API responda antes de lanzar los módulos de integración. */
async function detectarBackend(cliente) {
  try {
    const respuesta = await cliente.get('/estado', { auth: false, timeoutMs: 5000 });
    return respuesta.ok && respuesta.datos?.estado === 'ACTIVA';
  } catch {
    return false;
  }
}

async function ejecutarLimpieza(contexto, cliente) {
  if (contexto.limpieza.length === 0) {
    return null;
  }

  const inicio = performance.now();
  const pruebas = [];
  // LIFO: se deshace en orden inverso al de creación.
  for (const item of [...contexto.limpieza].reverse()) {
    const t0 = performance.now();
    try {
      await item.ejecutar();
      pruebas.push({ nombre: item.descripcion, ok: true, ms: performance.now() - t0 });
    } catch (error) {
      pruebas.push({
        nombre: item.descripcion,
        ok: false,
        ms: performance.now() - t0,
        error,
      });
    }
  }

  return { nombre: 'limpieza', ms: performance.now() - inicio, pruebas };
}

async function main() {
  const contexto = crearContexto();
  const cliente = crearCliente(config);

  imprimirCabecera(describirConfiguracion());

  const resultados = [];

  // El contrato estático corre siempre: no depende de la red.
  resultados.push(await ejecutarModulo(contrato, contexto, cliente));

  if (config.modo === 'contract') {
    for (const definicion of ORDEN.slice(1)) {
      resultados.push(
        moduloOmitido(definicion.nombre, 'TEST_MODE=contract: solo pruebas de contrato')
      );
    }
  } else {
    const disponible = await detectarBackend(cliente);
    if (!disponible) {
      for (const definicion of ORDEN.slice(1)) {
        resultados.push(
          moduloOmitido(
            definicion.nombre,
            `la API no respondió ACTIVA en ${config.baseUrl} (levanta backend y MySQL)`
          )
        );
      }
    } else {
      for (const definicion of ORDEN.slice(1)) {
        if (!moduloPorNombre(definicion.nombre)) {
          continue;
        }
        resultados.push(await ejecutarModulo(definicion, contexto, cliente));
      }

      const limpieza = await ejecutarLimpieza(contexto, cliente);
      if (limpieza) {
        resultados.push(limpieza);
      }
    }
  }

  imprimirTabla(resultados);
  imprimirFallos(resultados);
  imprimirRelaciones();
  imprimirResumen(resultados);

  // Un módulo omitido no es un fallo, pero un fallo sí cambia el código de salida.
  process.exitCode = codigoDeSalida(resultados);
}

main().catch((error) => {
  console.error('\nLa suite no pudo ejecutarse:', error);
  process.exitCode = 1;
});
