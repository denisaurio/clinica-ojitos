import { crearCliente } from '../lib/http.mjs';
import {
  asegurar,
  esArreglo,
  esObjeto,
  esTexto,
  igual,
  incluye,
  omitir,
} from '../lib/assert.mjs';
import { config } from '../lib/config.mjs';

export default {
  nombre: 'admin',
  async ejecutar({ prueba, ctx, cliente }) {
    await prueba('La bitácora de auditoría expone accesos y operaciones', async () => {
      ctx.exigirSesion();
      const { datos } = await cliente.get('/admin/auditoria?limite=20');
      const registros = esArreglo(datos, 'registros de auditoría');
      asegurar(registros.length > 0, 'la auditoría está vacía; las pruebas ya generaron eventos');

      for (const registro of registros) {
        esObjeto(registro, 'registro de auditoría');
        esTexto(registro.usuario, 'usuario del registro');
        esTexto(registro.accion, 'acción del registro');
        esTexto(registro.resultado, 'resultado del registro');
        asegurar('fecha' in registro, 'el registro no tiene fecha');
        asegurar('recurso' in registro, 'el registro no tiene recurso');
        asegurar('ip' in registro, 'el registro no tiene IP');
        asegurar('navegador' in registro, 'el registro no tiene navegador');
      }
    });

    await prueba('La auditoría se puede filtrar por acción', async () => {
      ctx.exigirSesion();
      const { datos } = await cliente.get('/admin/auditoria?accion=CREAR&limite=20');
      const registros = esArreglo(datos, 'registros filtrados');
      for (const registro of registros) {
        igual(registro.accion, 'CREAR', 'acción del registro filtrado');
      }
      incluye(
        registros,
        (registro) => String(registro.recurso).includes('PACIENTE') ||
          String(registro.recurso).includes('CONSULTA'),
        'no se encontró el alta de paciente o consulta en la auditoría'
      );
    });

    await prueba('La trazabilidad por paciente responde una lista', async () => {
      const paciente = ctx.exigirPaciente();
      const { datos } = await cliente.get(`/admin/auditoria/historial/${paciente.id}`);
      esArreglo(datos, 'accesos al historial del paciente');
    });

    await prueba('La auditoría exige rol ADMINISTRADOR', async () => {
      ctx.exigirSesion();
      if (!ctx.datos.sesionOftalmologo) {
        omitir('no hay sesión de oftalmólogo para comprobar el RBAC');
      }
      const clienteMedico = cliente.conToken(ctx.datos.sesionOftalmologo.token);
      const respuesta = await clienteMedico.get('/admin/auditoria', { permitirError: true });
      igual(respuesta.status, 403, 'un oftalmólogo no debe leer la auditoría');
    });

    await prueba('Sin token, la auditoría responde 401', async () => {
      const anonimo = crearCliente(config);
      const respuesta = await anonimo.get('/admin/auditoria', { permitirError: true });
      igual(respuesta.status, 401, 'sin token la auditoría debe responder 401');
    });

    await prueba('Una ruta inexistente con sesión responde 404', async () => {
      ctx.exigirSesion();
      const respuesta = await cliente.get('/admin/ruta-inexistente', { permitirError: true });
      igual(respuesta.status, 404, 'una ruta inexistente debe responder 404');
    });
  },
};
