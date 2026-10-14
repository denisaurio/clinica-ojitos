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