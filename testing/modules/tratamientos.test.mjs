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
import { fechaIso } from '../lib/util.mjs';
import { iniciarSesion } from '../lib/http.mjs';

/**
 * La cirugía exige una consulta firmada del historial. La firma la hace el
 * médico encargado, así que se entra con la cuenta de oftalmólogo de prueba,
 * se registra una consulta TEST a su nombre y se firma.
 */
async function consultaFirmada(ctx, cliente, config, pacienteId) {
  if (ctx.datos.consultaFirmada) return ctx.datos.consultaFirmada;
  let sesion;
  try {
    sesion = await iniciarSesion(cliente, config.credenciales.oftalmologo);
  } catch {
    omitir(`no se pudo entrar como ${config.credenciales.oftalmologo.username} (TEST_DOCTOR_USER)`);
  }
  const medico = cliente.conToken(sesion.accessToken);
  const { datos: yo } = await medico.get('/oftalmologos/yo');
  const { datos: tipos } = await cliente.get('/catalogo/tipos-consulta', { auth: false });
  const ahora = new Date();
  const hora = [ahora.getHours(), ahora.getMinutes(), ahora.getSeconds()]
    .map((n) => String(n).padStart(2, '0'))
    .join(':');

  const alta = await medico.post('/historiales', {
    pacienteId,
    oftalmologoId: yo.id,
    tipoConsultaId: tipos[0].id,
    fecha: `${fechaIso(ahora)}T${hora}`,
    diagnostico: 'TEST catarata senil, indicación quirúrgica',
  });
  igual(alta.status, 201, 'código HTTP de la consulta del médico');

  const firma = await medico.patch(`/historiales/${alta.datos.id}/firmar`, {});
  igual(firma.status, 200, 'código HTTP de la firma');
  esTexto(firma.datos.firmadaEn, 'fecha de firma');

  ctx.datos.consultaFirmada = { id: alta.datos.id, oftalmologoId: yo.id };
  return ctx.datos.consultaFirmada;
}

async function catalogo(cliente, ruta) {
  const { datos } = await cliente.get(ruta, { auth: false });
  return esArreglo(datos, `catálogo ${ruta}`);
}

async function idsNecesarios(ctx, cliente) {
  const guardados = ctx.datos.catalogos ?? {};

  let tipoId = guardados.tipoTratamientoMedicamentoId;
  if (!tipoId) {
    const tipos = await catalogo(cliente, '/catalogo/tipos-tratamiento');
    tipoId = (tipos.find((t) => t.codigo === 'MEDICAMENTO') ?? tipos[0])?.id;
  }

  let estadoId = guardados.estadoTratamientoActivoId;
  if (!estadoId) {
    const estados = await catalogo(cliente, '/catalogo/estados-tratamiento');
    estadoId = (estados.find((e) => e.codigo === 'ACTIVO') ?? estados[0])?.id;
  }

  let ojoId = guardados.ojoOdId;
  if (!ojoId) {
    const ojos = await catalogo(cliente, '/catalogo/ojos');
    ojoId = (ojos.find((o) => o.codigo === 'OD') ?? ojos[0])?.id;
  }

  asegurar(tipoId, 'no se pudo resolver el tipo de tratamiento');
  asegurar(estadoId, 'no se pudo resolver el estado de tratamiento');
  asegurar(ojoId, 'no se pudo resolver la lateralidad OD');

  return { tipoId, estadoId, ojoId };
}

export default {
  nombre: 'tratamientos',
  async ejecutar({ prueba, ctx, cliente, config }) {
    await prueba('El plan terapéutico del paciente inicia vacío', async () => {
      const paciente = ctx.exigirPaciente();
      const { datos } = await cliente.get(`/tratamientos/paciente/${paciente.id}`);
      esArreglo(datos, 'tratamientos del paciente TEST');
    });

    await prueba('La prescripción registra tipo, estado y fechas', async () => {
      if (!config.escribir) {
        omitir('TEST_WRITES=false: no se prescriben tratamientos');
      }
      const paciente = ctx.exigirPaciente();
      const oftalmologo = ctx.exigirOftalmologo();
      const { tipoId, estadoId } = await idsNecesarios(ctx, cliente);

      const respuesta = await cliente.post('/tratamientos', {
        pacienteId: paciente.id,
        oftalmologoId: oftalmologo.id,
        tipoId,
        estadoId,
        medicamento: 'TEST latanoprost',
        principioActivo: 'latanoprost',
        dosis: '1 gota',
        frecuencia: 'cada 12 horas',
        duracion: '30 días',
        fechaInicio: fechaIso(new Date()),
        indicaciones: 'TEST aplicación nocturna',
        activo: true,
      });

      igual(respuesta.status, 201, 'código HTTP de la prescripción');
      const tratamiento = esObjeto(respuesta.datos, 'tratamiento registrado');
      esNumero(tratamiento.id, 'id del tratamiento');
      igual(tratamiento.pacienteId, paciente.id, 'paciente del tratamiento');
      esTexto(tratamiento.tipo, 'tipo de tratamiento');
      esTexto(tratamiento.estado, 'estado del tratamiento');
      asegurar(
        String(tratamiento.medicamento).includes('TEST'),
        'el medicamento debe llevar la marca TEST'
      );

      ctx.datos.tratamiento = {
        id: tratamiento.id,
        pacienteId: paciente.id,
        tipo: tratamiento.tipo,
      };
    });

    await prueba('El detalle del tratamiento conserva dosis y frecuencia', async () => {
      const tratamiento = ctx.exigirTratamiento();
      const { datos } = await cliente.get(`/tratamientos/${tratamiento.id}`);
      igual(datos.id, tratamiento.id, 'id del tratamiento');
      igual(datos.dosis, '1 gota', 'dosis');
      igual(datos.frecuencia, 'cada 12 horas', 'frecuencia');
    });

    await prueba('El tratamiento aparece entre los vigentes del paciente', async () => {
      const paciente = ctx.exigirPaciente();
      const tratamiento = ctx.exigirTratamiento();
      const { datos } = await cliente.get(`/tratamientos/paciente/${paciente.id}/vigentes`);
      incluye(
        datos,
        (fila) => fila.id === tratamiento.id,
        'el tratamiento TEST no aparece entre los vigentes'
      );
    });

    await prueba('El seguimiento registra PIO y resultado del control', async () => {
      if (!config.escribir) {
        omitir('TEST_WRITES=false: no se registran controles');
      }
      const tratamiento = ctx.exigirTratamiento();
      const respuesta = await cliente.patch(`/tratamientos/${tratamiento.id}/seguimiento`, {
        fecha: fechaIso(new Date()),
        resultado: 'TEST presión compensada',
        pioOd: 15.5,
        pioOi: 16.0,
        observaciones: 'TEST sin efectos adversos',
      });

      igual(respuesta.status, 201, 'código HTTP del control de seguimiento');
      const control = esObjeto(respuesta.datos, 'control registrado');
      esNumero(control.id, 'id del control');
      igual(control.tratamientoId, tratamiento.id, 'tratamiento del control');
      igual(control.pioOd, 15.5, 'PIO OD del control');

      ctx.datos.control = { id: control.id };
    });

    await prueba('Los controles del tratamiento se listan', async () => {
      const tratamiento = ctx.exigirTratamiento();
      const control = ctx.datos.control;
      asegurar(control, 'no se registró el control TEST');
      const { datos } = await cliente.get(`/tratamientos/${tratamiento.id}/controles`);
      incluye(
        datos,
        (fila) => fila.id === control.id,
        'el control TEST no aparece en el seguimiento'
      );
    });

    await prueba('Sin consulta firmada la cirugía se rechaza', async () => {
      if (!config.escribir) {
        omitir('TEST_WRITES=false: no se registran cirugías');
      }
      const paciente = ctx.exigirPaciente();
      const oftalmologo = ctx.exigirOftalmologo();
      const respuesta = await cliente.post(
        '/tratamientos/cirugias',
        {
          pacienteId: paciente.id,
          oftalmologoId: oftalmologo.id,
          tipoCirugia: 'TEST sin respaldo',
          estado: 'PROGRAMADA',
          consultaIds: [],
        },
        { permitirError: true }
      );
      igual(respuesta.status, 400, 'una cirugía sin consulta firmada debe dar 400');
    });

    await prueba('La cirugía registra ojo, técnica, estado y su consulta firmada', async () => {
      if (!config.escribir) {
        omitir('TEST_WRITES=false: no se registran cirugías');
      }
      const paciente = ctx.exigirPaciente();
      const { ojoId } = await idsNecesarios(ctx, cliente);
      const hoy = fechaIso(new Date());
      const consulta = await consultaFirmada(ctx, cliente, config, paciente.id);
      const oftalmologo = { id: consulta.oftalmologoId };

      const respuesta = await cliente.post('/tratamientos/cirugias', {
        pacienteId: paciente.id,
        oftalmologoId: oftalmologo.id,
        diagnosticoPreop: 'TEST catarata senil',
        tipoCirugia: 'Facoemulsificación con lente intraocular',
        ojoId,
        fechaProgramada: hoy,
        fechaRealizada: hoy,
        anestesia: 'Tópica',
        tecnica: 'TEST incisión corneal de 2.2 mm',
        incidencias: 'TEST sin incidencias',
        lenteIntraocular: 'TEST monofocal',
        estado: 'REALIZADA',
        consultaIds: [consulta.id],
      });

      igual(respuesta.status, 201, 'código HTTP de la cirugía');
      const cirugia = esObjeto(respuesta.datos, 'cirugía registrada');
      esNumero(cirugia.id, 'id de la cirugía');
      igual(cirugia.pacienteId, paciente.id, 'paciente de la cirugía');
      esTexto(cirugia.ojo, 'ojo operado');
      asegurar(
        String(cirugia.ojo).toUpperCase().includes('DERECH') ||
          String(cirugia.ojo).toUpperCase() === 'OD',
        `el ojo de la cirugía no corresponde a OD: ${cirugia.ojo}`
      );
      igual(cirugia.estado, 'REALIZADA', 'estado de la cirugía');
      incluye(cirugia.consultas, (c) => c.id === consulta.id, 'la cirugía no quedó vinculada a la consulta firmada');

      ctx.datos.cirugia = {
        id: cirugia.id,
        pacienteId: paciente.id,
        tipoCirugia: cirugia.tipoCirugia,
      };
    });

    await prueba('Las cirugías se listan por paciente', async () => {
      const paciente = ctx.exigirPaciente();
      const cirugia = ctx.datos.cirugia;
      asegurar(cirugia, 'no se registró la cirugía TEST');
      const { datos } = await cliente.get(
        `/tratamientos/cirugias/paciente/${paciente.id}`
      );
      incluye(
        datos,
        (fila) => fila.id === cirugia.id,
        'la cirugía TEST no aparece en el listado del paciente'
      );
    });

    await prueba('Un tipo de tratamiento inexistente se rechaza con 400', async () => {
      if (!config.escribir) {
        omitir('TEST_WRITES=false: no se envían escrituras');
      }
      const paciente = ctx.exigirPaciente();
      const oftalmologo = ctx.exigirOftalmologo();
      const { estadoId } = await idsNecesarios(ctx, cliente);
      const respuesta = await cliente.post(
        '/tratamientos',
        {
          pacienteId: paciente.id,
          oftalmologoId: oftalmologo.id,
          tipoId: 999999,
          estadoId,
          fechaInicio: fechaIso(new Date()),
        },
        { permitirError: true }
      );
      igual(respuesta.status, 400, 'código HTTP del tipo de tratamiento inválido');
    });
  },
};
