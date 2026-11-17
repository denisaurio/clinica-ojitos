import { crearCliente, iniciarSesion } from '../lib/http.mjs';
import { asegurar, esNumero, esObjeto, esTexto, igual, omitir } from '../lib/assert.mjs';
import { config } from '../lib/config.mjs';

export default {
  nombre: 'auth',
  async ejecutar({ prueba, ctx, cliente }) {
    await prueba('Credenciales inválidas devuelven 401 sin token', async () => {
      const anonimo = crearCliente(config);
      const respuesta = await anonimo.post(
        '/auth/login',
        { username: config.credenciales.admin.username, password: 'clave-incorrecta' },
        { auth: false, permitirError: true }
      );
      igual(respuesta.status, 401, 'código HTTP con contraseña incorrecta');
      asegurar(
        !respuesta.datos?.accessToken,
        'una autenticación fallida no debe entregar accessToken'
      );
    });

    await prueba('El administrador inicia sesión y recibe un JWT', async () => {
      const sesion = await iniciarSesion(cliente, config.credenciales.admin);
      igual(sesion.rol, 'ADMINISTRADOR', 'rol devuelto por el login');
      esTexto(sesion.accessToken, 'accessToken');
      asegurar(
        sesion.accessToken.split('.').length === 3,
        'el accessToken no tiene forma de JWT (cabecera.payload.firma)'
      );
      igual(sesion.tokenType, 'Bearer', 'tipo de token');
      esNumero(sesion.expiresIn, 'vigencia del token en segundos');
      asegurar(sesion.expiresIn > 0, 'la vigencia del token debe ser positiva');

      cliente.setToken(sesion.accessToken);
      ctx.datos.sesion = {
        token: sesion.accessToken,
        rol: sesion.rol,
        username: sesion.username,
      };
    });

    await prueba('GET /auth/me devuelve el perfil autenticado', async () => {
      ctx.exigirSesion();
      const { datos } = await cliente.get('/auth/me');
      const perfil = esObjeto(datos, 'perfil');
      igual(perfil.username, config.credenciales.admin.username, 'usuario del perfil');
      igual(perfil.rol, 'ADMINISTRADOR', 'rol del perfil');
      asegurar(perfil.activo === true, 'el perfil del administrador debe estar activo');
      esTexto(perfil.nombreCompleto, 'nombre completo del perfil');
    });

    await prueba('GET /auth/intentos informa la cuenta y sus intentos', async () => {
      ctx.exigirSesion();
      const { datos } = await cliente.get('/auth/intentos');
      igual(datos.username, config.credenciales.admin.username, 'usuario consultado');
      esNumero(datos.intentosRestantes, 'intentos restantes');
      asegurar(datos.activo === true, 'la cuenta debe figurar activa');
    });

    await prueba('El oftalmólogo demo también puede autenticarse', async () => {
      const oftalmologo = crearCliente(config);
      const respuesta = await oftalmologo.post(
        '/auth/login',
        {
          username: config.credenciales.oftalmologo.username,
          password: config.credenciales.oftalmologo.password,
        },
        { auth: false, permitirError: true }
      );
      if (respuesta.status === 401) {
        omitir(
          `no existe el usuario demo ${config.credenciales.oftalmologo.username}; ` +
            'carga sql/02_datos_prueba.sql o ajusta TEST_DOCTOR_USER/PASSWORD'
        );
      }
      igual(respuesta.status, 200, 'login del oftalmólogo demo');
      igual(respuesta.datos.rol, 'OFTALMOLOGO', 'rol del oftalmólogo');
      ctx.datos.sesionOftalmologo = {
        token: respuesta.datos.accessToken,
        rol: respuesta.datos.rol,
        username: respuesta.datos.username,
      };
    });

    await prueba('Cerrar sesión responde un mensaje de confirmación', async () => {
      ctx.exigirSesion();
      const { datos } = await cliente.post('/auth/logout', {});
      esTexto(datos.mensaje, 'mensaje de cierre de sesión');
    });
  },
};
