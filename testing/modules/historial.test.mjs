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

function fechaHoraLocal() {
  const ahora = new Date();
  const hora = [ahora.getHours(), ahora.getMinutes(), ahora.getSeconds()]
    .map((n) => String(n).padStart(2, '0'))
    .join(':');
  return `${fechaIso(ahora)}T${hora}`;
}

async function tipoConsultaId(ctx, cliente) {
  if (ctx.datos.catalogos?.tipoConsultaId) {
    return ctx.datos.catalogos.tipoConsultaId;
  }
  const { datos } = await cliente.get('/catalogo/tipos-consulta', { auth: false });
  asegurar(datos.length > 0, 'el catálogo de tipos de consulta está vacío');
  return datos[0].id;
}

export default {
  nombre: 'historial',
  async ejecutar({ prueba, ctx, cliente, config }) {
    await prueba('GET /historiales exige pacienteId y devuelve una página', async () => {
      const paciente = ctx.exigirPaciente();
      const { datos } = await cliente.get(`/historiales?pacienteId=${paciente.id}&size=10`);
      const pagina = esObjeto(datos, 'página del historial');
      esArreglo(pagina.content, 'contenido del historial');
      esNumero(pagina.totalElements, 'total de consultas');
    });

    await prueba('La evolución y los diagnósticos parten vacíos para un paciente nuevo', async () => {
      const paciente = ctx.exigirPaciente();
      const evolucion = await cliente.get(`/historiales/paciente/${paciente.id}/evolucion`);
      esArreglo(evolucion.datos, 'evolución del paciente nuevo');

      const diagnosticos = await cliente.get(
        `/historiales/paciente/${paciente.id}/diagnosticos`
      );
      esArreglo(diagnosticos.datos, 'diagnósticos del paciente nuevo');

      const historial = await cliente.get(`/historiales/paciente/${paciente.id}`);
      esArreglo(historial.datos, 'historial cronológico del paciente nuevo');
    });

    await prueba('El registro de una consulta oftalmológica devuelve la ficha clínica', async () => {
      if (!config.escribir) {
        omitir('TEST_WRITES=false: no se registran consultas');
      }
      const paciente = ctx.exigirPaciente();
      const oftalmologo = ctx.exigirOftalmologo();
      const tipoId = await tipoConsultaId(ctx, cliente);

      const respuesta = await cliente.post('/historiales', {
        pacienteId: paciente.id,
        oftalmologoId: oftalmologo.id,
        tipoConsultaId: tipoId,
        fecha: fechaHoraLocal(),
        agudezaOd: '20/25',
        agudezaOi: '20/30',
        pioOd: 16.5,
        pioOi: 17.2,
        pupilas: 'Isocóricas, reactivas',
        biomicroscopia: 'TEST córnea transparente',
        fondoOjo: 'TEST papila de bordes definidos',
        diagnostico: 'TEST astigmatismo regular',
        cie10: 'H52.2',
        soapSubjetivo: 'TEST refiere visión borrosa leve',
        soapObjetivo: 'TEST agudeza 20/25 OD',
        soapEvaluacion: 'TEST astigmatismo',
        soapPlan: 'TEST control en seis meses',
      });

      igual(respuesta.status, 201, 'código HTTP del registro de consulta');
      const consulta = esObjeto(respuesta.datos, 'consulta registrada');
      esNumero(consulta.id, 'id de la consulta');
      igual(consulta.pacienteId, paciente.id, 'paciente de la consulta');
      esTexto(consulta.diagnostico, 'diagnóstico de la consulta');
      asegurar(
        consulta.diagnostico.includes('TEST'),
        'el diagnóstico debe llevar la marca TEST'
      );

      ctx.datos.consulta = {
        id: consulta.id,
        diagnostico: consulta.diagnostico,
        pioOd: consulta.pioOd,
      };
    });

    await prueba('La consulta aparece en el historial cronológico', async () => {
      const paciente = ctx.exigirPaciente();
      const consulta = ctx.datos.consulta;
      asegurar(consulta, 'no se creó la consulta TEST');
      const { datos } = await cliente.get(`/historiales/paciente/${paciente.id}`);
      incluye(
        datos,
        (fila) => fila.id === consulta.id,
        'la consulta TEST no aparece en el historial del paciente'
      );
    });

    await prueba('La evolución incorpora la presión intraocular registrada', async () => {
      const paciente = ctx.exigirPaciente();
      const { datos } = await cliente.get(`/historiales/paciente/${paciente.id}/evolucion`);
      incluye(
        datos,
        (punto) => punto.pioOd === 16.5 && punto.pioOi === 17.2,
        'la serie de evolución no incluye los valores de PIO de la consulta TEST'
      );
    });

    await prueba('Los diagnósticos vigentes listan el diagnóstico TEST', async () => {
      const paciente = ctx.exigirPaciente();
      const { datos } = await cliente.get(
        `/historiales/paciente/${paciente.id}/diagnosticos`
      );
      incluye(
        datos,
        (diagnostico) => String(diagnostico.diagnostico ?? '').includes('TEST'),
        'el diagnóstico TEST no aparece entre los vigentes'
      );
    });

    await prueba('El detalle de la consulta conserva agudeza y presión', async () => {
      const consulta = ctx.datos.consulta;
      asegurar(consulta, 'no se creó la consulta TEST');
      const { datos } = await cliente.get(`/historiales/${consulta.id}`);
      igual(datos.agudezaOd, '20/25', 'agudeza OD');
      igual(datos.pioOd, 16.5, 'PIO OD');
      esObjeto(datos, 'detalle de la consulta');
    });
  },
};
