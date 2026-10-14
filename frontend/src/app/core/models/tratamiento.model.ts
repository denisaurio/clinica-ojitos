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
  tipo: TipoTratamiento;
  medicamento: string;
  dosis: string;
  frecuencia: string;
  duracion: string;
  instrucciones: string;
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
  diagnosticoPreoperatorio: string;
  tipoCirugia: string;
  fecha: string;
  lateralidad: Lateralidad;
  tipoAnestesia: string;
  reporteOperatorio: string;
  estado: 'PROGRAMADA' | 'EN_CURSO' | 'FINALIZADA' | 'COMPLICACION';
}

export interface CirugiaRequest {
  pacienteId: number;
  diagnosticoPreoperatorio: string;
  tipoCirugia: string;
  fecha: string;
  lateralidad: Lateralidad;
  tipoAnestesia: string;
  reporteOperatorio: string;
}