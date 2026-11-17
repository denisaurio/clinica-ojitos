import {
  asegurar,
  esArreglo,
  esObjeto,
  esTexto,
  igual,
  omitir,
} from '../lib/assert.mjs';

export default {
  nombre: 'dashboards',
  async ejecutar({ prueba, ctx, cliente }) {
    await prueba('El panel del administrador trae indicadores y accesos', async () => {
      ctx.exigirSesion();
      const { datos } = await cliente.get('/dashboards/admin');
      const panel = esObjeto(datos, 'panel del administrador');
      const indicadores = esArreglo(panel.indicadores, 'indicadores del administrador');
      asegurar(indicadores.length > 0, 'el panel del administrador no tiene indicadores');
      for (const indicador of indicadores) {
        esTexto(indicador.etiqueta, 'etiqueta del indicador');
        esTexto(indicador.valor, 'valor del indicador');
      }
      esArreglo(panel.tendenciaVolumen, 'tendencia de volumen');
      esArreglo(panel.accesosRecientes, 'accesos recientes');
    });

    await prueba('El panel del médico muestra agenda y tareas', async () => {
      const oftalmologo = ctx.exigirOftalmologo();
      const { datos } = await cliente.get(
        `/dashboards/medico?oftalmologoId=${oftalmologo.id}`
      );
      const panel = esObjeto(datos, 'panel del médico');
      esArreglo(panel.indicadores, 'indicadores del médico');
      esArreglo(panel.agendaHoy, 'agenda de hoy');
      esArreglo(panel.tareas, 'tareas pendientes');
      esArreglo(panel.historialesRecientes, 'historiales recientes');
    });

    await prueba('El panel de recepción muestra citas y consultorios', async () => {
      ctx.exigirSesion();
      const { datos } = await cliente.get('/dashboards/recepcion');
      const panel = esObjeto(datos, 'panel de recepción');
      esArreglo(panel.indicadores, 'indicadores de recepción');
      esArreglo(panel.citasHoy, 'citas de hoy');
      esArreglo(panel.consultorios, 'consultorios');
      esArreglo(panel.avisos, 'avisos operativos');
    });

    await prueba('El portal del paciente se resuelve con su propia cuenta', async () => {
      const sesion = ctx.datos.sesionPaciente;
      if (!sesion) {
        omitir('no se pudo iniciar sesión como el paciente TEST');
      }
      const paciente = ctx.exigirPaciente();
      const clientePaciente = cliente.conToken(sesion.token);
      const { datos } = await clientePaciente.get('/dashboards/paciente');
      const portal = esObjeto(datos, 'portal del paciente');
      esTexto(portal.nombre, 'nombre del paciente en el portal');
      igual(portal.nombre, paciente.nombreCompleto, 'nombre del portal');
      esArreglo(portal.proximasCitas, 'próximas citas');
      esArreglo(portal.diagnosticos, 'diagnósticos del portal');
      esArreglo(portal.evolucion, 'evolución del portal');
    });
  },
};
