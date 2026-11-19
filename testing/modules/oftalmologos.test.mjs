import {
  asegurar,
  esArreglo,
  esNumero,
  esObjeto,
  esTexto,
  igual,
  incluye,
} from '../lib/assert.mjs';

export default {
  nombre: 'oftalmologos',
  async ejecutar({ prueba, ctx, cliente }) {
    await prueba('El directorio responde paginado y con búsqueda', async () => {
      ctx.exigirSesion();
      const { datos } = await cliente.get('/oftalmologos?page=0&size=100');
      const pagina = esObjeto(datos, 'página del directorio');
      esArreglo(pagina.content, 'contenido del directorio');
      esNumero(pagina.totalElements, 'total de oftalmólogos');
      asegurar(pagina.content.length > 0, 'el directorio está vacío; carga los datos demo');
    });

    await prueba('Los profesionales activos alimentan los desplegables', async () => {
      ctx.exigirSesion();
      const { datos } = await cliente.get('/oftalmologos/activos');
      const activos = esArreglo(datos, 'oftalmólogos activos');
      asegurar(activos.length > 0, 'no hay oftalmólogos activos');
      for (const profesional of activos) {
        igual(profesional.activo, true, `el profesional ${profesional.id} debe estar activo`);
        esTexto(profesional.nombreCompleto, 'nombre del profesional activo');
      }
      ctx.datos.oftalmologo = {
        id: activos[0].id,
        nombreCompleto: activos[0].nombreCompleto,
        numeroColegiatura: activos[0].numeroColegiatura,
      };
      ctx.datos.oftalmologosActivos = activos;
    });

    await prueba('La ficha del profesional trae colegiatura y subespecialidad', async () => {
      const oftalmologo = ctx.exigirOftalmologo();
      const { datos } = await cliente.get(`/oftalmologos/${oftalmologo.id}`);
      igual(datos.id, oftalmologo.id, 'id de la ficha');
      esTexto(datos.nombres, 'nombres');
      esTexto(datos.apellidos, 'apellidos');
      esTexto(datos.numeroColegiatura, 'número de colegiatura');
      esTexto(datos.email, 'correo institucional');
    });

    await prueba('La matriz de horarios devuelve días y tipos con código', async () => {
      ctx.exigirSesion();
      const activos = ctx.datos.oftalmologosActivos ?? [];
      let elegido = null;
      let horarios = [];

      for (const profesional of activos.slice(0, 5)) {
        const { datos } = await cliente.get(`/oftalmologos/${profesional.id}/horarios`);
        const lista = esArreglo(datos, `horarios de ${profesional.id}`);
        if (lista.length > 0) {
          elegido = profesional;
          horarios = lista;
          break;
        }
      }

      asegurar(
        elegido,
        'ninguno de los primeros profesionales activos tiene horarios cargados'
      );

      ctx.datos.oftalmologo = {
        id: elegido.id,
        nombreCompleto: elegido.nombreCompleto,
        numeroColegiatura: elegido.numeroColegiatura,
      };
      ctx.datos.horarios = horarios;

      for (const bloque of horarios) {
        esNumero(bloque.diaSemanaId, 'id del día');
        esTexto(bloque.diaSemanaCodigo, 'código del día');
        asegurar(
          ['LUN', 'MAR', 'MIE', 'JUE', 'VIE', 'SAB', 'DOM'].includes(bloque.diaSemanaCodigo),
          `día inesperado ${bloque.diaSemanaCodigo}`
        );
        esTexto(bloque.tipoBloqueCodigo, 'código del tipo de bloque');
        asegurar(
          ['CONSULTA', 'CIRUGIA', 'DESCANSO'].includes(bloque.tipoBloqueCodigo),
          `tipo de bloque inesperado ${bloque.tipoBloqueCodigo}`
        );
        esTexto(bloque.horaInicio, 'hora de inicio');
        esTexto(bloque.horaFin, 'hora de fin');
      }
    });

    await prueba('Las métricas del profesional son numéricas', async () => {
      const oftalmologo = ctx.exigirOftalmologo();
      const { datos } = await cliente.get(`/oftalmologos/${oftalmologo.id}/metricas`);
      esNumero(datos.pacientesAtendidos, 'pacientes atendidos');
      esNumero(datos.citasSemana, 'citas de la semana');
      esNumero(datos.horasSemanales, 'horas semanales');
      esNumero(datos.cirugiasRealizadas, 'cirugías realizadas');
      // Sin encuestas de satisfacción el dato llega vacío (antes era inventado).
      if (datos.satisfaccionMedia !== undefined && datos.satisfaccionMedia !== null) {
        esNumero(datos.satisfaccionMedia, 'satisfacción media');
      }
      asegurar(
        datos.horasSemanales >= 0 && datos.horasSemanales <= 168,
        'las horas semanales deben estar entre 0 y 168'
      );
    });

    await prueba('La verificación de colegiatura distingue existente de libre', async () => {
      const oftalmologo = ctx.exigirOftalmologo();
      const existe = await cliente.get(
        `/oftalmologos/existe-colegiatura?numero=${encodeURIComponent(
          oftalmologo.numeroColegiatura
        )}`
      );
      igual(existe.datos.existe, true, 'la colegiatura del profesional debe existir');

      const libre = await cliente.get(
        '/oftalmologos/existe-colegiatura?numero=ZZZ-9999999'
      );
      igual(libre.datos.existe, false, 'una colegiatura improbable no debe existir');
    });

    await prueba('El directorio se puede filtrar por colegiatura', async () => {
      const oftalmologo = ctx.exigirOftalmologo();
      const { datos } = await cliente.get(
        `/oftalmologos?buscar=${encodeURIComponent(oftalmologo.numeroColegiatura)}&size=20`
      );
      incluye(
        datos.content,
        (fila) => fila.id === oftalmologo.id,
        'la búsqueda por colegiatura no devolvió al profesional'
      );
    });
  },
};
