export interface Oftalmologo {
  id: number;
  nombres: string;
  apellidos: string;
  nombreCompleto: string;
  iniciales: string;
  email: string;
  telefono: string;
  numeroColegiatura: string;
  subespecialidad: string;
  sede: string;
  activo: boolean;
  fotoUrl: string;
}

export interface OftalmologoRequest {
  nombres: string;
  apellidos: string;
  email: string;
  telefono: string;
  numeroColegiatura: string;
  subespecialidad: string;
  sede: string;

  /** Id del catálogo de subespecialidades; el texto tecleado se resuelve aparte. */
  subespecialidadId?: number | null;

  /** Id del catálogo de sedes. */
  sedeId?: number | null;
}

export type DiaSemana = 'LUNES' | 'MARTES' | 'MIERCOLES' | 'JUEVES' | 'VIERNES';

export interface BloqueHorario {
  dia: DiaSemana;
  horaInicio: string;
  horaFin: string;
  tipo: 'DISPONIBLE' | 'QUIRURGICO';
}

export interface HorarioSemanal {
  bloques: BloqueHorario[];
}

/** Respuesta de `/oftalmologos/{id}/metricas` (imagen 41). */
export interface MetricasOftalmologo {
  pacientesAtendidos: number;
  citasSemana: number;
  valoracionMedia: number;
}

export interface ExisteColegiaturaResponse {
  existe: boolean;
}
/**
 * Credenciales del primer ingreso de un profesional.
 *
 * La contraseña llega una sola vez, en la respuesta del alta: el sistema solo
 * guarda su hash BCrypt y no existe forma de recuperarla después.
 */
export interface Credenciales {
  username: string;
  password: string;
  nombreCompleto: string;
  textoParaDescargar: string;
}

/** Alta de oftalmólogo: la ficha junto con sus credenciales. */
export interface AltaOftalmologo {
  oftalmologo: Oftalmologo;
  credenciales: Credenciales | null;
}