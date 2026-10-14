/** Consulta oftalmológica registrada en el historial de un paciente. */
export interface Consulta {
  id: number;
  pacienteId: number;
  pacienteNombre: string;
  fecha: string;
  hora: string;
  motivo: string;
  tipoConsulta: string;
  diagnosticoPrincipal: string;
  agudezaOd: string;
  agudezaOi: string;
  pioOd: number;
  pioOi: number;
  pupilas: string;
  biomicroscopia: string;
  fondoOjo: string;
  notasSubjectivo: string;
  notasObjetivo: string;
  notasEvaluacion: string;
  notasPlan: string;
  oftalmologoId: number;
  oftalmologoNombre: string;
  archivos: ArchivoConsulta[];
  esUltima: boolean;
}

export interface ArchivoConsulta {
  id: number;
  nombre: string;
  tipo: 'IMAGEN' | 'PDF';
  url: string;
}

/** Punto de la serie de `/historiales/paciente/{id}/evolucion`. */
export interface PuntoEvolucion {
  fecha: string;
  pioOd: number;
  pioOi: number;
  agudezaOd: string;
  agudezaOi: string;
  diagnostico: string;
}

/** Fila de la tabla «Evolución de la Agudeza Visual». */
export interface RegistroAgudeza {
  fecha: string;
  etiqueta: string;
  agudezaOd: string;
  agudezaOi: string;
  observaciones: string;
  estable: boolean;
}

export interface ConsultaRequest {
  pacienteId: number;
  motivo: string;
  tipoConsulta: string;
  diagnosticoPrincipal: string;
  agudezaOd: string;
  agudezaOi: string;
  pioOd: number;
  pioOi: number;
  pupilas: string;
  biomicroscopia: string;
  fondoOjo: string;
  notasSubjectivo: string;
  notasObjetivo: string;
  notasEvaluacion: string;
  notasPlan: string;
}

export interface ExamenRequest {
  nombre: string;
  tipo: string;
  notas: string;
  archivoNombre: string;
}