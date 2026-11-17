import { crearCliente } from '../lib/http.mjs';
import {
  asegurar,
  esArreglo,
  esObjeto,
  igual,
  omitir,
} from '../lib/assert.mjs';
import { config } from '../lib/config.mjs';

export default {
  nombre: 'seguridad',
  async ejecutar({ prueba, ctx, cliente }) {
    await prueba('Sin token, los pacientes no se pueden listar', async () => {
      const anonimo = crearCliente(config);
      const respuesta = await anonimo.get('/pacientes', { permitirError: true });
      igual(respuesta.status, 401, 'sin token GET /pacientes debe responder 401');
    });

    await prueba('La agenda general ya no está abierta al rol PACIENTE', async () => {
      const sesion = ctx.datos.sesionPaciente;
      if (!sesion) {
        omitir('no hay sesión de paciente para comprobar la fuga de agenda');
      }
      const clientePaciente = cliente.conToken(sesion.token);
      const respuesta = await clientePaciente.get('/citas', { permitirError: true });
      igual(respuesta.status, 403, 'un paciente no debe leer la agenda general');
    });

    await prueba('El paciente no puede abrir la ficha administrativa de pacientes', async () => {
      const sesion = ctx.datos.sesionPaciente;
      if (!sesion) {
        omitir('no hay sesión de paciente');
      }
      const paciente = ctx.exigirPaciente();
      const clientePaciente = cliente.conToken(sesion.token);
      const respuesta = await clientePaciente.get(`/pacientes/${paciente.id}`, {
        permitirError: true,
      });
      igual(respuesta.status, 403, 'un paciente no debe usar el listado administrativo');
    });

    await prueba('El paciente sí puede leer su propio historial', async () => {
      const sesion = ctx.datos.sesionPaciente;
      if (!sesion) {
        omitir('no hay sesión de paciente');
      }
      const paciente = ctx.exigirPaciente();
      const clientePaciente = cliente.conToken(sesion.token);
      const respuesta = await clientePaciente.get(`/historiales/paciente/${paciente.id}`);
      esArreglo(respuesta.datos, 'historial propio del paciente');
    });

    await prueba('El paciente no puede leer el historial de otra ficha', async () => {
      const sesion = ctx.datos.sesionPaciente;
      if (!sesion) {
        omitir('no hay sesión de paciente');
      }
      const paciente = ctx.exigirPaciente();
      const clientePaciente = cliente.conToken(sesion.token);
      const respuesta = await clientePaciente.get(
        `/historiales/paciente/${paciente.id + 1000000}`,
        { permitirError: true }
      );
      asegurar(
        [403, 404].includes(respuesta.status),
        `el historial ajeno debe denegarse (403/404) y respondió ${respuesta.status}`
      );
    });

    await prueba('El paciente lee su plan terapéutico pero no la agenda', async () => {
      const sesion = ctx.datos.sesionPaciente;
      if (!sesion) {
        omitir('no hay sesión de paciente');
      }
      const paciente = ctx.exigirPaciente();
      const clientePaciente = cliente.conToken(sesion.token);

      const tratamientos = await clientePaciente.get(
        `/tratamientos/paciente/${paciente.id}`
      );
      esArreglo(tratamientos.datos, 'tratamientos propios del paciente');

      const cita = await clientePaciente.get('/citas/1', { permitirError: true });
      igual(cita.status, 403, 'un paciente no debe consultar el detalle de citas');
    });

    await prueba('El oftalmólogo no entra a la auditoría ni al panel de admin', async () => {
      const sesion = ctx.datos.sesionOftalmologo;
      if (!sesion) {
        omitir('no hay sesión de oftalmólogo para comprobar el RBAC');
      }
      const clienteMedico = cliente.conToken(sesion.token);

      const auditoria = await clienteMedico.get('/admin/auditoria', { permitirError: true });
      igual(auditoria.status, 403, 'la auditoría es solo del administrador');

      const panel = await clienteMedico.get('/dashboards/admin', { permitirError: true });
      igual(panel.status, 403, 'el panel de administrador es solo del administrador');
    });

    await prueba('El paciente no entra al panel de administrador', async () => {
      const sesion = ctx.datos.sesionPaciente;
      if (!sesion) {
        omitir('no hay sesión de paciente');
      }
      const clientePaciente = cliente.conToken(sesion.token);
      const respuesta = await clientePaciente.get('/dashboards/admin', { permitirError: true });
      igual(respuesta.status, 403, 'un paciente no debe ver el panel de administrador');
    });

    await prueba('El administrador conserva el acceso administrativo', async () => {
      ctx.exigirSesion();
      const respuesta = await cliente.get('/pacientes?size=1');
      esObjeto(respuesta.datos, 'listado administrativo de pacientes');
      igual(respuesta.status, 200, 'código HTTP del listado para el administrador');
    });
  },
};
