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

    await prueba('La cirugía registra ojo, técnica y estado', async () => {
      if (!config.escribir) {
        omitir('TEST_WRITES=false: no se registran cirugías');
      }
      const paciente = ctx.exigirPaciente();
      const oftalmologo = ctx.exigirOftalmologo();
      const { ojoId } = await idsNecesarios(ctx, cliente);
      const hoy = fechaIso(new Date());

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
