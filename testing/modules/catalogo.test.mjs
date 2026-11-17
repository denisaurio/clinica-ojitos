import {
  asegurar,
  esArreglo,
  esObjeto,
  esTexto,
  igual,
  incluye,
} from '../lib/assert.mjs';

const CLAVES_CATALOGO = [
  'tiposConsulta',
  'subespecialidades',
  'tiposTratamiento',
  'tiposExamen',
  'seguros',
  'estadosCita',
  'ojos',
  'diasSemana',
  'tiposBloque',
  'estadosTratamiento',
  'sedes',
];

function items(respuesta, nombre) {
  return esArreglo(respuesta.datos, nombre);
}

function porCodigo(lista, codigo) {
  return lista.find((item) => item.codigo === codigo);
}

export default {
  nombre: 'catalogo',
  async ejecutar({ prueba, ctx, cliente }) {
    await prueba('GET /catalogo entrega los once catálogos', async () => {
      const { datos } = await cliente.get('/catalogo', { auth: false });
      esObjeto(datos, 'catálogos');
      for (const clave of CLAVES_CATALOGO) {
        seguramenteArreglo(datos[clave], clave);
      }
    });

    await prueba('Días de la semana usan códigos LUN..DOM', async () => {
      const dias = items(await cliente.get('/catalogo/dias-semana', { auth: false }), 'días');
      asegurar(dias.length === 7, `se esperaban 7 días y llegaron ${dias.length}`);
      const codigos = dias.map((dia) => dia.codigo);
      for (const codigo of ['LUN', 'MAR', 'MIE', 'JUE', 'VIE', 'SAB', 'DOM']) {
        incluye(codigos, (c) => c === codigo, `falta el día ${codigo}`);
      }
      ctx.datos.diasSemana = dias;
    });

    await prueba('Tipos de bloque son CONSULTA, CIRUGIA y DESCANSO', async () => {
      const tipos = items(await cliente.get('/catalogo/tipos-bloque', { auth: false }), 'bloques');
      const codigos = tipos.map((tipo) => tipo.codigo);
      for (const codigo of ['CONSULTA', 'CIRUGIA', 'DESCANSO']) {
        incluye(codigos, (c) => c === codigo, `falta el tipo de bloque ${codigo}`);
      }
      ctx.datos.tiposBloque = tipos;
    });

    await prueba('La lateralidad es OD, OI y AO', async () => {
      const ojos = items(await cliente.get('/catalogo/ojos', { auth: false }), 'ojos');
      const codigos = ojos.map((ojo) => ojo.codigo);
      for (const codigo of ['OD', 'OI', 'AO']) {
        incluye(codigos, (c) => c === codigo, `falta la lateralidad ${codigo}`);
      }
      const od = porCodigo(ojos, 'OD');
      esTexto(od.nombre, 'nombre de OD');
      ctx.datos.catalogos = { ...(ctx.datos.catalogos ?? {}), ojoOdId: od.id };
    });

    await prueba('Los estados de tratamiento incluyen ACTIVO', async () => {
      const estados = items(
        await cliente.get('/catalogo/estados-tratamiento', { auth: false }),
        'estados de tratamiento'
      );
      const activo = porCodigo(estados, 'ACTIVO');
      asegurar(activo, 'falta el estado ACTIVO en el catálogo');
      ctx.datos.catalogos = { ...(ctx.datos.catalogos ?? {}), estadoTratamientoActivoId: activo.id };
    });

    await prueba('Los tipos de tratamiento y consulta alimentan los formularios', async () => {
      const tiposTratamiento = items(
        await cliente.get('/catalogo/tipos-tratamiento', { auth: false }),
        'tipos de tratamiento'
      );
      const medicamento = porCodigo(tiposTratamiento, 'MEDICAMENTO');
      asegurar(medicamento, 'falta el tipo de tratamiento MEDICAMENTO');

      const tiposConsulta = items(
        await cliente.get('/catalogo/tipos-consulta', { auth: false }),
        'tipos de consulta'
      );
      asegurar(tiposConsulta.length > 0, 'el catálogo de tipos de consulta está vacío');

      ctx.datos.catalogos = {
        ...(ctx.datos.catalogos ?? {}),
        tipoTratamientoMedicamentoId: medicamento.id,
        tipoConsultaId: tiposConsulta[0].id,
      };
    });

    await prueba('Estados de cita, seguros, exámenes y subespecialidades tienen datos', async () => {
      const estadosCita = items(
        await cliente.get('/catalogo/estados-cita', { auth: false }),
        'estados de cita'
      );
      incluye(estadosCita, (e) => e.codigo === 'PROGRAMADA', 'falta PROGRAMADA');
      incluye(estadosCita, (e) => e.codigo === 'CANCELADA', 'falta CANCELADA');

      for (const [ruta, nombre] of [
        ['/catalogo/seguros', 'seguros'],
        ['/catalogo/tipos-examen', 'tipos de examen'],
        ['/catalogo/subespecialidades', 'subespecialidades'],
        ['/catalogo/sedes', 'sedes'],
      ]) {
        const lista = items(await cliente.get(ruta, { auth: false }), nombre);
        asegurar(lista.length > 0, `${nombre} está vacío`);
      }
    });

    await prueba('El buscador de sedes filtra sin distinguir mayúsculas', async () => {
      const todas = items(await cliente.get('/catalogo/sedes', { auth: false }), 'sedes');
      const primera = todas[0];
      const termino = primera.nombre.slice(0, 4).toUpperCase();
      const encontradas = items(
        await cliente.get(`/catalogo/sedes/buscar?q=${encodeURIComponent(termino)}`, {
          auth: false,
        }),
        'sedes filtradas'
      );
      incluye(
        encontradas,
        (sede) => sede.id === primera.id,
        `la búsqueda ${termino} no encontró ${primera.nombre}`
      );
    });
  },
};

function seguramenteArreglo(valor, nombre) {
  asegurar(Array.isArray(valor), `el catálogo ${nombre} no es una lista`);
}
