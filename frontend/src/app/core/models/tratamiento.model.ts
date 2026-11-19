export type TipoTratamiento = 'MEDICACION' | 'LENTES' | 'TERAPIA' | 'CIRUGIA';

export interface Tratamiento {
  id: number;
  pacienteId: number;
  pacienteNombre: string;
  tipo: TipoTratamiento;
  medicamento: string;
  dosis: string;
  frecuencia: string;
  duracion: string;
  instrucciones: string;
  fechaInicio: string;
  fechaFin: string;
  estado: 'ACTIVO' | 'SUSPENDIDO' | 'FINALIZADO';
}

export interface TratamientoRequest {
  pacienteId: number;
  oftalmologoId?: number | null;
  /** Id del catálogo `tipo_tratamiento` (obligatorio en la API). */
  tipoId: number;
  /** Id del catálogo `estado_tratamiento`; «Activo» al prescribir. */
  estadoId: number;
  medicamento?: string;
  principioActivo?: string;
  dosis?: string;
  frecuencia?: string;
  duracion?: string;
  instrucciones?: string;
  fechaInicio?: string;
}

/** Control de seguimiento de un tratamiento. */
export interface ControlTratamiento {
  id: number;
  tratamientoId: number;
  fecha: string;
  resultado: string;
  pioOd: number;
  pioOi: number;
  observaciones: string;
}

export interface SeguimientoRequest {
  fecha: string;
  resultado: string;
  pioOd: number;
  pioOi: number;
  observaciones: string;
}

/** Hito de la línea de tiempo de 6 meses (imagen 35). */
export interface HitoControl {
  id: number;
  etiqueta: string;
  fecha: string;
  estado: 'COMPLETADO' | 'MEJORA' | 'SIN_CAMBIOS' | 'PENDIENTE';
  resumen: string;
}

export type Lateralidad = 'OD' | 'OI' | 'AO';

export interface Cirugia {
  id: number;
  pacienteId: number;
  pacienteNombre: string;
  oftalmologoId?: number;
  oftalmologoNombre?: string;
  diagnosticoPreoperatorio: string;
  tipoCirugia: string;
  fecha: string;
  lateralidad: Lateralidad;
  tipoAnestesia: string;
  reporteOperatorio: string;
  estado: 'PROGRAMADA' | 'EN_CURSO' | 'FINALIZADA' | 'COMPLICACION';
  /** Consultas firmadas del historial que respaldan la cirugía. */
  consultas?: ConsultaVinculada[];
}

export interface ConsultaVinculada {
  id: number;
  fecha: string;
  diagnostico: string;
  oftalmologoNombre?: string;
}

export interface CirugiaRequest {
  pacienteId: number;
  /** El backend exige el oftalmólogo responsable de la intervención. */
  oftalmologoId: number;
  diagnosticoPreoperatorio: string;
  tipoCirugia: string;
  fecha: string;
  lateralidad: Lateralidad;
  tipoAnestesia: string;
  reporteOperatorio: string;
  /** PROGRAMADA (se indica tras la consulta) o REALIZADA (ya se operó). */
  estado: 'PROGRAMADA' | 'REALIZADA';
  /** Consultas firmadas que justifican la cirugía (una o varias). */
  consultaIds: number[];
}