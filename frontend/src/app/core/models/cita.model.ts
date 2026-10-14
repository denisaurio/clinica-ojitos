export type EstadoCita =
  | 'PROGRAMADA'
  | 'CONFIRMADA'
  | 'EN_ESPERA'
  | 'EN_CURSO'
  | 'COMPLETADA'
  | 'CANCELADA'
  | 'NO_ASISTIO';

export interface Cita {
  id: number;
  pacienteId: number;
  pacienteNombre: string;
  documentoPaciente: string;
  telefonoPaciente: string;
  oftalmologoId: number;
  oftalmologoNombre: string;
  fecha: string;
  horaInicio: string;
  horaFin: string;
  tipoConsulta: string;
  motivo: string;
  estadoCita: EstadoCita;
  notas: string;
  motivoCancelacion: string;
}

export interface CitaRequest {
  pacienteId: number;
  oftalmologoId: number;
  fecha: string;
  horaInicio: string;
  horaFin: string;
  tipoConsulta: string;
  motivo: string;
  notas: string;
}

export interface ReprogramarRequest {
  fecha: string;
  horaInicio: string;
  horaFin: string;
  notaInterna: string;
}

export interface CancelarRequest {
  motivo: string;
}

export interface EstadoRequest {
  estado: EstadoCita;
}

/** Evento devuelto por `/citas/agenda`, ya normalizado para el calendario. */
export interface EventoAgenda {
  id: number;
  titulo: string;
  detalle: string;
  fecha: string;
  horaInicio: string;
  horaFin: string;
  estadoCita: EstadoCita;
  pacienteId: number;
  oftalmologoNombre: string;
  tipoConsulta: string;
}

/** Bloque devuelto por `/citas/disponibilidad`. */
export interface SlotDisponibilidad {
  horaInicio: string;
  horaFin: string;
  estado: 'FREE' | 'BOOKED';
}