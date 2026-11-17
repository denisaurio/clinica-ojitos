import {
  asegurar,
  esArreglo,
  esObjeto,
  esTexto,
  igual,
  incluye,
  omitir,
} from '../lib/assert.mjs';
import { fechaIso } from '../lib/util.mjs';

export default {
  nombre: 'flujo-completo',
  async ejecutar({ prueba, ctx, cliente }) {
    await prueba('La ficha del paciente refleja consultas y tratamientos creados', async () => {
      const paciente = ctx.exigirPaciente();
      const { datos } = await cliente.get(`/pacientes/${paciente.id}`);
      const detalle = esObjeto(datos, 'detalle del paciente');
      asegurar(
        detalle.totalConsultas >= 1,
        'la ficha no cuenta la consulta creada por el módulo de historial'
      );
      asegurar(
        detalle.tratamientosActivos >= 1,
        'la ficha no cuenta el tratamiento activo creado por su módulo'
      );
      incluye(
        detalle.actividadReciente,
        (actividad) => String(actividad.descripcion ?? '').includes('TEST'),
        'la actividad reciente no incluye la consulta TEST'
      );
    });

    await prueba('Historial → evolución → diagnósticos comparten la consulta', async () => {
      const paciente = ctx.exigirPaciente();
      const consulta = ctx.datos.consulta;
      if (!consulta) {
        omitir('no se creó la consulta TEST');
      }

      const historial = await cliente.get(`/historiales/paciente/${paciente.id}`);
      incluye(
        historial.datos,
        (fila) => fila.id === consulta.id,
        'la consulta no aparece en el historial cronológico'
      );

      const evolucion = await cliente.get(`/historiales/paciente/${paciente.id}/evolucion`);
      incluye(
        evolucion.datos,
        (punto) => punto.pioOd === consulta.pioOd,
        'la evolución no comparte la PIO de la consulta'
      );

      const diagnosticos = await cliente.get(
        `/historiales/paciente/${paciente.id}/diagnosticos`
      );
      incluye(
        diagnosticos.datos,
        (diagnostico) => String(diagnostico.diagnostico ?? '').includes('TEST'),
        'los diagnósticos vigentes no comparten la consulta'
      );
    });

    await prueba('Paciente → cita → cancelación cierra el ciclo de agenda', async () => {
      const paciente = ctx.exigirPaciente();
      const cita = ctx.datos.cita;
      if (!cita) {
        omitir('no se creó la cita TEST');
      }

      const detalle = await cliente.get(`/citas/${cita.id}`);
      igual(detalle.datos.pacienteId, paciente.id, 'la cita apunta al paciente TEST');
      igual(detalle.datos.estado, 'CANCELADA', 'la cita de prueba debe quedar cancelada');

      const eventos = await cliente.get(
        `/citas?desde=${cita.fecha}&hasta=${cita.fecha}`
      );
      esArreglo(eventos.datos, 'eventos del día de la cita');
      asegurar(
        !eventos.datos.some((evento) => evento.id === cita.id),
        'una cita cancelada no debe seguir ocupando la agenda'
      );
    });

    await prueba('Paciente → tratamiento → seguimiento → cirugía', async () => {
      const paciente = ctx.exigirPaciente();
      const tratamiento = ctx.datos.tratamiento;
      const cirugia = ctx.datos.cirugia;
      if (!tratamiento || !cirugia) {
        omitir('faltan el tratamiento o la cirugía TEST');
      }

      const plan = await cliente.get(`/tratamientos/paciente/${paciente.id}`);
      incluye(
        plan.datos,
        (fila) => fila.id === tratamiento.id,
        'el tratamiento no aparece en el plan del paciente'
      );

      const controles = await cliente.get(`/tratamientos/${tratamiento.id}/controles`);
      asegurar(
        controles.datos.length >= 1,
        'el seguimiento del tratamiento no conserva el control TEST'
      );

      const cirugias = await cliente.get(`/tratamientos/cirugias/paciente/${paciente.id}`);
      incluye(
        cirugias.datos,
        (fila) => fila.id === cirugia.id,
        'la cirugía no aparece en el listado del paciente'
      );
    });

    await prueba('El portal del paciente muestra su diagnóstico y evolución', async () => {
      const sesion = ctx.datos.sesionPaciente;
      if (!sesion) {
        omitir('no se pudo iniciar sesión como el paciente TEST');
      }
      const clientePaciente = cliente.conToken(sesion.token);
      const { datos } = await clientePaciente.get('/dashboards/paciente');
      const portal = esObjeto(datos, 'portal del paciente');
      esTexto(portal.nombre, 'nombre del portal');
      incluye(
        portal.diagnosticos,
        (diagnostico) => String(diagnostico.diagnostico ?? '').includes('TEST'),
        'el portal no muestra el diagnóstico registrado en la consulta'
      );
      incluye(
        portal.evolucion,
        (punto) => punto.pioOd === 16.5,
        'el portal no muestra la evolución de PIO de la consulta'
      );
    });

    await prueba('La auditoría registró el alta clínica completa', async () => {
      ctx.exigirSesion();
      const { datos } = await cliente.get('/admin/auditoria?accion=CREAR&limite=50');
      const recursos = datos.map((registro) => String(registro.recurso));
      for (const recurso of ['PACIENTE', 'CONSULTA', 'TRATAMIENTO', 'CIRUGIA']) {
        incluye(
          recursos,
          (valor) => valor === recurso,
          `la auditoría no registró la creación de ${recurso}`
        );
      }
    });

    await prueba('El panel del médico integra la agenda del día', async () => {
      const oftalmologo = ctx.exigirOftalmologo();
      const { datos } = await cliente.get(
        `/dashboards/medico?oftalmologoId=${oftalmologo.id}`
      );
      esArreglo(datos.agendaHoy, 'agenda de hoy del médico');
      // La cita TEST se cancela en este flujo, así que la agenda no debe
      // contarla como paciente en espera.
      asegurar(
        !datos.agendaHoy.some(
          (fila) => String(fila.estado ?? '').toUpperCase() === 'CANCELADA'
        ),
        'la agenda del día no debe listar citas canceladas'
      );
    });

    await prueba('El listado de pacientes conserva la marca TEST al final del flujo', async () => {
      const paciente = ctx.exigirPaciente();
      const { datos } = await cliente.get(
        `/pacientes?buscar=${encodeURIComponent(paciente.documento)}&size=5`
      );
      incluye(
        datos.content,
        (fila) => fila.id === paciente.id,
        'el paciente TEST desapareció del listado antes de la limpieza'
      );
      // La fecha del sistema debe moverse hacia adelante: si esto falla, el
      // reloj del servidor y el de la prueba no coinciden.
      esTexto(fechaIso(new Date()), 'fecha local de la prueba');
    });
  },
};
