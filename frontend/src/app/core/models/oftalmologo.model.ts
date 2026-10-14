import { Credenciales } from './common.model';

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
/** Alta de oftalmólogo: la ficha junto con sus credenciales de primer ingreso. */
export interface AltaOftalmologo {
  oftalmologo: Oftalmologo;
  credenciales: Credenciales | null;
}