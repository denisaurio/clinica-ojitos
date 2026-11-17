import {
  asegurar,
  esArreglo,
  esNumero,
  esObjeto,
  esTexto,
  igual,
  incluye,
  omitir,
} from '../lib/assert.mjs';
import { fechaIso, sumarDias } from '../lib/util.mjs';

function horaCorta(hora) {
  return String(hora ?? '').slice(0, 5);
}

/**
 * Busca la primera franja FREE en los próximos días. Devuelve también la fecha
 * porque la disponibilidad depende del día de la semana del profesional.
 */
async function buscarFranjaLibre(cliente, oftalmologoId, dias = 21, excluir = null) {
  const hoy = new Date();
  for (let i = 0; i <= dias; i += 1) {
    const fecha = fechaIso(sumarDias(hoy, i));
    const { datos } = await cliente.get(
      `/citas/disponibilidad?oftalmologoId=${oftalmologoId}&fecha=${fecha}`
    );
    const franjas = esArreglo(datos, `disponibilidad del ${fecha}`);
    const libre = franjas.find(
      (franja) =>
        franja.estado === 'FREE' &&
        !(excluir && excluir.fecha === fecha && excluir.horaInicio === franja.horaInicio)
    );
    if (libre) {
      return { fecha, horaInicio: libre.horaInicio, horaFin: libre.horaFin };
    }
  }
  return null;
}

export default {
  nombre: 'citas',
  async ejecutar({ prueba, ctx, cliente, config }) {
    await prueba('La agenda semanal devuelve eventos del rango', async () => {
      ctx.exigirSesion();
      const hoy = new Date();
      const desde = fechaIso(hoy);
      const hasta = fechaIso(sumarDias(hoy, 6));
      const { datos } = await cliente.get(`/citas?desde=${desde}&hasta=${hasta}`);
      const eventos = esArreglo(datos, 'eventos de la agenda');
      for (const evento of eventos) {
        esNumero(evento.id, 'id del evento');
        esTexto(evento.fecha, 'fecha del evento');
        esTexto(evento.horaInicio, 'hora de inicio del evento');
        asegurar(
          evento.fecha >= desde && evento.fecha <= hasta,
          `el evento ${evento.id} (${evento.fecha}) está fuera del rango pedido`
        );
      }
    });

    await prueba('La agenda diaria responde para hoy', async () => {
      ctx.exigirSesion();
      const { datos } = await cliente.get(`/citas/agenda?fecha=${fechaIso(new Date())}`);
      esArreglo(datos, 'agenda del día');
    });

    await prueba('La disponibilidad se calcula por oftalmólogo y fecha', async () => {
      const oftalmologo = ctx.exigirOftalmologo();
      const { datos } = await cliente.get(
        `/citas/disponibilidad?oftalmologoId=${oftalmologo.id}&fecha=${fechaIso(new Date())}`
      );
      const franjas = esArreglo(datos, 'franjas del día');
      for (const franja of franjas) {
        esTexto(franja.horaInicio, 'hora de inicio de la franja');
        esTexto(franja.horaFin, 'hora de fin de la franja');
        asegurar(
          ['FREE', 'BOOKED'].includes(franja.estado),
          `estado de franja inesperado: ${franja.estado}`
        );
      }
    });

    await prueba('El alta de cita ocupa una franja libre', async () => {
      if (!config.escribir) {
        omitir('TEST_WRITES=false: no se crean citas');
      }
      const paciente = ctx.exigirPaciente();
      const oftalmologo = ctx.exigirOftalmologo();
      const franja = await buscarFranjaLibre(cliente, oftalmologo.id);
      asegurar(
        franja,
        'no hay franjas libres en los próximos 21 días; revisa la matriz de horarios demo'
      );

      const tipoConsultaId = ctx.datos.catalogos?.tipoConsultaId ?? null;
      const respuesta = await cliente.post('/citas', {
        pacienteId: paciente.id,
        oftalmologoId: oftalmologo.id,
        fecha: franja.fecha,
        horaInicio: franja.horaInicio,
        horaFin: franja.horaFin,
        tipoConsultaId,
        motivo: 'TEST control de agenda',
        notaInterna: 'TEST cita creada por la suite',
      });

      igual(respuesta.status, 201, 'código HTTP del alta de cita');
      const cita = esObjeto(respuesta.datos, 'cita registrada');
      esNumero(cita.id, 'id de la cita');
      igual(cita.pacienteId, paciente.id, 'paciente de la cita');
      igual(cita.estado, 'PROGRAMADA', 'estado inicial de la cita');
      igual(cita.ocupaAgenda, true, 'la cita debe ocupar la agenda');
      igual(cita.fecha, franja.fecha, 'fecha de la cita');

      ctx.datos.cita = {
        id: cita.id,
        fecha: franja.fecha,
        horaInicio: franja.horaInicio,
        horaFin: franja.horaFin,
        oftalmologoId: oftalmologo.id,
      };
    });

    await prueba('El detalle de la cita conserva paciente y profesional', async () => {
      const cita = ctx.exigirCita();
      const { datos } = await cliente.get(`/citas/${cita.id}`);
      igual(datos.id, cita.id, 'id de la cita');
      esTexto(datos.pacienteNombre, 'nombre del paciente en la cita');
      esTexto(datos.oftalmologoNombre, 'nombre del oftalmólogo en la cita');
      esTexto(datos.estado, 'estado de la cita');
    });

    await prueba('La franja ocupada pasa a BOOKED en disponibilidad', async () => {
      const cita = ctx.exigirCita();
      const { datos } = await cliente.get(
        `/citas/disponibilidad?oftalmologoId=${cita.oftalmologoId}&fecha=${cita.fecha}`
      );
      incluye(
        datos,
        (franja) => franja.horaInicio === cita.horaInicio && franja.estado === 'BOOKED',
        'la franja de la cita no figura como BOOKED'
      );
    });

    await prueba('No se puede cruzar el horario del mismo oftalmólogo', async () => {
      const paciente = ctx.exigirPaciente();
      const cita = ctx.exigirCita();
      const respuesta = await cliente.post(
        '/citas',
        {
          pacienteId: paciente.id,
          oftalmologoId: cita.oftalmologoId,
          fecha: cita.fecha,
          horaInicio: cita.horaInicio,
          horaFin: cita.horaFin,
          motivo: 'TEST cruce de horario',
        },
        { permitirError: true }
      );
      igual(respuesta.status, 409, 'código HTTP del cruce de horario');
    });

    await prueba('El cambio de estado avanza el flujo de atención', async () => {
      const cita = ctx.exigirCita();
      const { datos } = await cliente.patch(`/citas/${cita.id}/estado`, {
        estado: 'CONFIRMADA',
      });
      igual(datos.estado, 'CONFIRMADA', 'estado tras confirmar la cita');
    });

    await prueba('La reprogramación mueve la cita a otra franja libre', async () => {
      const cita = ctx.exigirCita();
      const nueva = await buscarFranjaLibre(cliente, cita.oftalmologoId, 21, cita);
      if (!nueva) {
        omitir('no hay una segunda franja libre para reprogramar');
      }

      const { datos } = await cliente.patch(`/citas/${cita.id}/reprogramar`, {
        fecha: nueva.fecha,
        horaInicio: nueva.horaInicio,
        horaFin: nueva.horaFin,
        notaInterna: 'TEST reprogramación de la suite',
      });

      igual(datos.id, cita.id, 'id de la cita reprogramada');
      igual(datos.fecha, nueva.fecha, 'nueva fecha de la cita');
      igual(horaCorta(datos.horaInicio), horaCorta(nueva.horaInicio), 'nueva hora de inicio');

      ctx.datos.cita = { ...cita, ...nueva };
    });

    await prueba('La cancelación libera la franja y conserva el registro', async () => {
      const cita = ctx.exigirCita();
      const { datos } = await cliente.patch(`/citas/${cita.id}/cancelar`, {
        motivo: 'TEST cancelación de la suite',
      });
      igual(datos.estado, 'CANCELADA', 'estado tras cancelar');
      igual(datos.ocupaAgenda, false, 'una cita cancelada no ocupa la agenda');
      igual(datos.id, cita.id, 'la cita cancelada conserva su id');
    });

    await prueba('Tras cancelar, la franja vuelve a estar libre', async () => {
      const cita = ctx.exigirCita();
      const { datos } = await cliente.get(
        `/citas/disponibilidad?oftalmologoId=${cita.oftalmologoId}&fecha=${cita.fecha}`
      );
      incluye(
        datos,
        (franja) => franja.horaInicio === cita.horaInicio && franja.estado === 'FREE',
        'la franja cancelada no volvió a FREE'
      );
    });

    await prueba('Una cita inexistente responde 404', async () => {
      ctx.exigirSesion();
      const respuesta = await cliente.get('/citas/999999999', { permitirError: true });
      igual(respuesta.status, 404, 'código HTTP de una cita inexistente');
    });
  },
};
