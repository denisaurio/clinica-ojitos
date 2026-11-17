import { asegurar, igual, esObjeto, esTexto, incluye } from '../lib/assert.mjs';

export default {
  nombre: 'estado',
  async ejecutar({ prueba, cliente }) {
    await prueba('GET /estado responde ACTIVA sin autenticación', async () => {
      const respuesta = await cliente.get('/estado', { auth: false });
      igual(respuesta.status, 200, 'código HTTP de /estado');
      const cuerpo = esObjeto(respuesta.datos, 'cuerpo de /estado');
      igual(cuerpo.estado, 'ACTIVA', 'estado del servicio');
      esTexto(cuerpo.servicio ?? cuerpo.nombre ?? cuerpo.aplicacion, 'nombre del servicio');
      esTexto(cuerpo.version, 'versión de la API');
    });

    await prueba('El health check enumera los módulos RF', async () => {
      const { datos } = await cliente.get('/estado', { auth: false });
      const modulos = esObjeto(datos.modulos, 'mapa de módulos del health check');
      incluye(Object.keys(modulos), (clave) => clave === 'RF-01', 'falta el módulo RF-01');
      for (const codigo of ['RF-01', 'RF-02', 'RF-03', 'RF-04', 'RF-05', 'RF-06']) {
        asegurar(codigo in modulos, `el health check no declara ${codigo}`);
      }
    });
  },
};
