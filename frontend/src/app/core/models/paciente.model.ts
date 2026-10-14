import { Credenciales } from './common.model';

/** Paciente registrado en la clínica. */
export interface Paciente {
  id: number;
  nombres: string;
  apellidos: string;
  nombreCompleto: string;
  documento: string;
  fechaNacimiento: string;
  edad: number;
  telefono: string;
  email: string;
  direccion: string;
  seguro: string;
  grupoSanguineo: string;
  antecedentesOculares: string;
  alergias: string;
  activo: boolean;
  fechaRegistro: string;
}

/** Cuerpo de alta y edición. El backend calcula `edad` y `nombreCompleto`. */
export interface PacienteRequest {
  /** Nombre de usuario para el portal. Vacío = nombre completo del paciente. */
  usuario?: string;

  /** Contraseña de acceso; el backend la guarda cifrada con BCrypt. */
  password?: string;
  nombres: string;
  apellidos: string;
  documento: string;
  fechaNacimiento: string;
  telefono: string;
  email: string;
  direccion: string;
  seguro: string;
  grupoSanguineo: string;
  antecedentesOculares: string;
  alergias: string;
}

/** Respuesta de `/pacientes/existe-documento`. */
export interface ExisteDocumentoResponse {
  existe: boolean;
}

/** Elemento de `/pacientes/{id}/actividad-reciente`. */
export interface ActividadReciente {
  tipo: 'CONSULTA' | 'EXAMEN' | 'CITA' | 'TRATAMIENTO';
  titulo: string;
  detalle: string;
  fecha: string;
}

/** Fila de la tabla de pacientes tal y como la pinta el prototipo. */
export interface PacienteListItem {
  id: number;
  nombreCompleto: string;
  iniciales: string;
  documento: string;
  edad: number;
  telefono: string;
  email: string;
  seguro: string;
}
/**
 * Alta de paciente: la ficha junto con las credenciales del portal.
 *
 * La contraseña llega una sola vez, en la respuesta del alta.
 */
export interface AltaPaciente {
  paciente: Paciente;
  credenciales: Credenciales;
}
