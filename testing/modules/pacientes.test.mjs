import { crearCliente, iniciarSesion } from '../lib/http.mjs';
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
import { config } from '../lib/config.mjs';
import { fechaIso, marcaDePrueba } from '../lib/util.mjs';

export default {
  nombre: 'pacientes',
  async ejecutar({ prueba, ctx, cliente, config }) {
    const marca = marcaDePrueba();
    // El documento admite 20 caracteres: se recorta la marca para que quepa.
    const documento = `T${marca.slice(4)}`;
    const documentoBaja = `B${marca.slice(4)}`;
    const password = 'Ojitos2026*';
    const username = `prueba.${marca}`.toLowerCase();
    const email = `prueba.${marca}@example.com`.toLowerCase();

    const cuerpo = {
      password,
      username,
      nombres: 'Prueba',
      apellidos: `Automática ${marca}`,
      documento,
      fechaNacimiento: '1990-01-15',
      telefono: '999000111',
      email,
      direccion: 'Av. de las Pruebas 123',
      grupoSanguineo: 'O+',
      historialOcular: 'TEST sin antecedentes oculares',
      alergias: 'TEST ninguna conocida',
      activo: true,
    };

    await prueba('GET /pacientes devuelve una página con contenido', async () => {
      ctx.exigirSesion();
      const { datos } = await cliente.get('/pacientes?page=0&size=5');
      const pagina = esObjeto(datos, 'página de pacientes');
      esArreglo(pagina.content, 'contenido de la página');
      esNumero(pagina.totalElements, 'total de pacientes');
      asegurar(pagina.totalElements >= 0, 'el total de pacientes no puede ser negativo');
    });

    await prueba('La verificación de documento responde antes del alta', async () => {
      ctx.exigirSesion();
      const { datos } = await cliente.get(
        `/pacientes/existe-documento?documento=${encodeURIComponent(documento)}`
      );
      igual(datos.existe, false, `el documento ${documento} no debería existir todavía`);
    });

    await prueba('El alta devuelve la ficha y las credenciales del portal', async () => {
      if (!config.escribir) {
        omitir('TEST_WRITES=false: no se crean pacientes');
      }
      ctx.exigirSesion();
      const respuesta = await cliente.post('/pacientes', cuerpo);
      igual(respuesta.status, 201, 'código HTTP del alta de paciente');
      const alta = esObjeto(respuesta.datos, 'respuesta del alta');
      const paciente = esObjeto(alta.paciente, 'ficha del paciente');
      esNumero(paciente.id, 'id del paciente');
      igual(paciente.documento, documento, 'documento del paciente');
      igual(paciente.activo, true, 'el paciente debe nacer activo');

      const credenciales = esObjeto(alta.credenciales, 'credenciales del portal');
      esTexto(credenciales.username, 'usuario del portal');
      esTexto(credenciales.password, 'contraseña del portal');
      esTexto(credenciales.textoParaDescargar, 'texto descargable de credenciales');

      ctx.datos.paciente = {
        id: paciente.id,
        documento,
        nombreCompleto: paciente.nombreCompleto,
        credenciales: {
          username: credenciales.username,
          password: credenciales.password,
        },
      };

      ctx.registrarLimpieza(`Baja del paciente TEST ${documento}`, async () => {
        const baja = await cliente.del(`/pacientes/${paciente.id}`, { permitirError: true });
        asegurar(
          [200, 204, 404].includes(baja.status),
          `no se pudo dar de baja al paciente ${paciente.id}: HTTP ${baja.status}`
        );
      });
    });

    await prueba('El documento ya registrado se detecta como existente', async () => {
      const paciente = ctx.exigirPaciente();
      const { datos } = await cliente.get(
        `/pacientes/existe-documento?documento=${encodeURIComponent(paciente.documento)}`
      );
      igual(datos.existe, true, 'el documento recién creado debe existir');
    });

    await prueba('Un documento duplicado se rechaza con 409', async () => {
      ctx.exigirSesion();
      const respuesta = await cliente.post('/pacientes', cuerpo, { permitirError: true });
      igual(respuesta.status, 409, 'código HTTP del documento duplicado');
    });

    await prueba('La ficha trae contadores y actividad reciente', async () => {
      const paciente = ctx.exigirPaciente();
      const { datos } = await cliente.get(`/pacientes/${paciente.id}`);
      const detalle = esObjeto(datos, 'detalle del paciente');
      const ficha = esObjeto(detalle.paciente, 'ficha dentro del detalle');
      igual(ficha.id, paciente.id, 'id de la ficha');
      esNumero(detalle.totalConsultas, 'total de consultas');
      esNumero(detalle.totalCitas, 'total de citas');
      esNumero(detalle.tratamientosActivos, 'tratamientos activos');
      esArreglo(detalle.actividadReciente, 'actividad reciente');

      const actividad = await cliente.get(`/pacientes/${paciente.id}/actividad-reciente`);
      esArreglo(actividad.datos, 'actividad reciente directa');
    });

    await prueba('La búsqueda encuentra al paciente por documento', async () => {
      const paciente = ctx.exigirPaciente();
      const { datos } = await cliente.get(
        `/pacientes?buscar=${encodeURIComponent(paciente.documento)}&size=10`
      );
      incluye(
        datos.content,
        (fila) => fila.id === paciente.id,
        'la búsqueda por documento no devolvió al paciente TEST'
      );
    });

    await prueba('La edición actualiza los datos de contacto', async () => {
      const paciente = ctx.exigirPaciente();
      const { datos } = await cliente.put(`/pacientes/${paciente.id}`, {
        ...cuerpo,
        telefono: '999000222',
        direccion: 'Av. de las Pruebas 456',
      });
      igual(datos.id, paciente.id, 'id del paciente editado');
      igual(datos.telefono, '999000222', 'teléfono actualizado');
    });

    await prueba('El paciente recién creado puede entrar a su portal', async () => {
      const paciente = ctx.exigirPaciente();
      try {
        const clientePaciente = crearCliente(config);
        const sesion = await iniciarSesion(clientePaciente, paciente.credenciales);
        igual(sesion.rol, 'PACIENTE', 'rol del usuario del portal');
        ctx.datos.sesionPaciente = {
          token: sesion.accessToken,
          rol: sesion.rol,
          username: sesion.username,
        };
      } catch (error) {
        throw new Error(`las credenciales del alta no sirven para el portal: ${error.message}`);
      }
    });

    await prueba('La baja es lógica y conserva la ficha', async () => {
      if (!config.escribir) {
        omitir('TEST_WRITES=false: no se crean pacientes');
      }
      ctx.exigirSesion();
      const sufijo = marca.slice(4);
      const alta = await cliente.post('/pacientes', {
        ...cuerpo,
        documento: documentoBaja,
        username: `baja.${marca}`.toLowerCase(),
        email: `baja.${marca}@example.com`.toLowerCase(),
        nombres: 'Baja',
        apellidos: `Lógica ${sufijo}`,
        telefono: '999000333',
        fechaNacimiento: fechaIso(new Date(1985, 5, 20)),
      });
      igual(alta.status, 201, 'código HTTP del alta para la baja');
      const id = alta.datos.paciente.id;

      ctx.registrarLimpieza(`Baja del paciente TEST ${documentoBaja}`, async () => {
        const respuesta = await cliente.del(`/pacientes/${id}`, { permitirError: true });
        asegurar(
          [200, 204, 404].includes(respuesta.status),
          `no se pudo limpiar el paciente ${id}: HTTP ${respuesta.status}`
        );
      });

      const baja = await cliente.del(`/pacientes/${id}`);
      igual(baja.status, 204, 'código HTTP de la baja lógica');

      const ficha = await cliente.get(`/pacientes/${id}`);
      igual(ficha.datos.paciente.activo, false, 'el paciente debe quedar inactivo');
      igual(ficha.datos.paciente.documento, documentoBaja, 'la ficha se conserva');
    });
  },
};
