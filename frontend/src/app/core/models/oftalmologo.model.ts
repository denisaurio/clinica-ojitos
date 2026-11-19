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

  /** Contraseña inicial que elige el administrador (solo en el alta). */
  password?: string;
}

export type DiaSemana =
  | 'LUNES'
  | 'MARTES'
  | 'MIERCOLES'
  | 'JUEVES'
  | 'VIERNES'
  | 'SABADO'
  | 'DOMINGO';

export interface BloqueHorario {
  /** Id del catálogo `dia_semana`; necesario para guardar en la API. */
  diaSemanaId?: number;
  dia: DiaSemana;
  horaInicio: string;
  horaFin: string;
  /** Id del catálogo `tipo_bloque_horario`; necesario para guardar en la API. */
  tipoBloqueId?: number;
  /** `DESCANSO` marca bloqueos de agenda que no se ofrecen como cita. */
  tipo: 'DISPONIBLE' | 'QUIRURGICO' | 'DESCANSO';
  sedeId?: number | null;
  activo?: boolean;
}

export interface HorarioSemanal {
  bloques: BloqueHorario[];
}

/** Respuesta de `/oftalmologos/{id}/metricas` (imagen 41). */
export interface MetricasOftalmologo {
  pacientesAtendidos: number;
  citasSemana: number;
  /** Horas de atención por semana según su horario (sin descansos). */
  horasSemanales: number;
  cirugiasRealizadas: number;
  /** Sin fuente de datos real (no hay encuestas): llega vacío y no se muestra. */
  valoracionMedia: number | null;
}

export interface ExisteColegiaturaResponse {
  existe: boolean;
}
/** Alta de oftalmólogo: la ficha junto con sus credenciales de primer ingreso. */
export interface AltaOftalmologo {
  oftalmologo: Oftalmologo;
  credenciales: Credenciales | null;
}