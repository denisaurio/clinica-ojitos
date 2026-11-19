import { EstadoCita } from './cita.model';

/** Tarjeta de métrica de los dashboards. */
export interface TarjetaMetrica {
  etiqueta: string;
  valor: string;
  delta: string;
  icono: string;
}

/** Barra del gráfico de volumen de pacientes (imagen 44). */
export interface PuntoVolumen {
  etiqueta: string;
  total: number;
  destacado: boolean;
}

/** Fila del registro de accesos del administrador. */
export interface IntentoAcceso {
  usuario: string;
  ip: string;
  hora: string;
  resultado: 'EXITOSO' | 'FALLIDO';
}

/** Fila de la lista «Agenda del Día» del panel médico (imagen 45). */
export interface CitaDia extends TarjetaCita {
  sala: string;
}

export interface TarjetaCita {
  id: number;
  horaInicio: string;
  horaFin: string;
  pacienteNombre: string;
  motivo: string;
  tipoConsulta: string;
  estado: EstadoCita;
  /** Para enlazar a la ficha; puede faltar en datos de demostración. */
  pacienteId?: number;
  /** Profesional que atiende la cita. */
  oftalmologo?: string;
  /** AAAA-MM-DD; el portal del paciente la necesita para mostrar el día real. */
  fecha?: string;
}

/** Tarea pendiente del panel médico. */
export interface TareaPendiente {
  id: number;
  titulo: string;
  detalle: string;
  icono: string;
}

export interface HistorialReciente {
  id: number;
  iniciales: string;
  pacienteNombre: string;
  hora: string;
}

export interface DashboardAdmin {
  totalPacientes: number;
  citasHoy: number;
  oftalmologosActivos: number;
  volumenPacientes: PuntoVolumen[];
  intentosAcceso: IntentoAcceso[];
}

/** Métrica resumida que calcula el backend (DashboardDto.Indicador). */
export interface IndicadorPanel {
  etiqueta: string;
  valor: string;
  detalle?: string;
}

export interface DashboardMedico {
  fecha: string;
  /** Vacío en modo demostración: la pantalla los calcula de la agenda. */
  indicadores?: IndicadorPanel[];
  citasHoy: CitaDia[];
  pendientes: TareaPendiente[];
  historialesRecientes: HistorialReciente[];
}

export interface EstadoMedico {
  id: number;
  nombreCompleto: string;
  iniciales: string;
  subespecialidad: string;
  estado: 'OCUPADO' | 'DISPONIBLE';
  detalle: string;
}

export interface AvisoOperativo {
  icono: string;
  texto: string;
}

export interface DashboardRecepcion {
  citasHoy: TarjetaCita[];
  totalCitas: number;
  enEspera: number;
  medicos: EstadoMedico[];
  avisos: AvisoOperativo[];
}

export interface DiagnosticoPortal {
  nombre: string;
  ojo: string;
  ultimaActualizacion: string;
  estado: 'ESTABLE' | 'EN_SEGUIMIENTO';
}

export interface DashboardPaciente {
  /** Id de la ficha propia: para reservar y abrir su historial. */
  pacienteId?: number;
  nombre: string;
  citas: TarjetaCita[];
  diagnosticos: DiagnosticoPortal[];
}

export interface MensajePortal {
  id: number;
  remitente: string;
  mensaje: string;
  fecha: string;
  leido: boolean;
}