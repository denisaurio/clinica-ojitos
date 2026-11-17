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
  subespecialidad?: string;
  fecha: string;
  horaInicio: string;
  horaFin: string;
  tipoConsulta: string;
  motivo: string;
  estadoCita: EstadoCita;
  notas: string;
  motivoCancelacion: string;
}

/** Alta de cita. El backend referencia los catálogos por id (CitaDto.Request). */
export interface CitaRequest {
  pacienteId: number;
  oftalmologoId: number;
  fecha: string;
  horaInicio: string;
  horaFin: string;
  tipoConsultaId: number | null;
  motivo: string;
  notaInterna: string;
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

/** Evento del calendario semanal, ya normalizado para la pantalla de agenda. */
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
