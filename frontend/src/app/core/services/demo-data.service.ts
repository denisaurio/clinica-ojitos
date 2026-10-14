import { Injectable } from '@angular/core';
import {
  ActividadReciente,
  AuthResponse,
  BloqueHorario,
  Cita,
  CatalogoItem,
  Consulta,
  ControlTratamiento,
  DashboardAdmin,
  DashboardMedico,
  DashboardPaciente,
  DashboardRecepcion,
  EventoAgenda,
  ExamenRequest,
  HitoControl,
  MensajePortal,
  MetricasOftalmologo,
  Oftalmologo,
  Paciente,
  PacienteListItem,
  PuntoEvolucion,
  SlotDisponibilidad,
  Tratamiento,
} from '../models';

/**
 * Datos de demostración extraídos del prototipo (imágenes 24–47).
 *
 * Cuando `environment.useMockApi` es `true`, los servicios de API devuelven
 * esta capa en lugar de emitir llamadas HTTP, de modo que `npm start` funciona
 * sin backend levantado. Los nombres, documentos y cifras son ficticios.
 */
@Injectable({ providedIn: 'root' })
export class DemoDataService {
  // -------------------------------------------------------------- Usuarios
  /**
   * Cuentas del modo demostración.
   *
   * Usernames y contraseñas idénticos a los que crea `sql/02_datos_prueba.sql`
   * y `sql/04_cuentas_iniciales.sql`, para que las mismas credenciales sirvan
   * con el mock y contra la API real.
   */
  readonly usuarios: Record<string, { password: string; auth: Omit<AuthResponse, 'accessToken'> }> = {
    admin: {
      password: 'admin123',
      auth: {
        tokenType: 'Bearer',
        expiresIn: 28800,
        id: 1,
        username: 'admin',
        nombreCompleto: 'Administrador Ojitos',
        email: 'admin@clinicaojitos.pe',
        rol: 'ADMINISTRADOR',
      },
    },
    'dra.rostova': {
      password: 'Ojitos2026*',
      auth: {
        tokenType: 'Bearer',
        expiresIn: 28800,
        id: 2,
        username: 'dra.rostova',
        nombreCompleto: 'Elena Rostova',
        email: 'e.rostova@clinicaojitos.pe',
        rol: 'OFTALMOLOGO',
      },
    },
    'dr.mendoza': {
      password: 'Ojitos2026*',
      auth: {
        tokenType: 'Bearer',
        expiresIn: 28800,
        id: 4,
        username: 'dr.mendoza',
        nombreCompleto: 'Carlos Mendoza',
        email: 'c.mendoza@clinicaojitos.pe',
        rol: 'OFTALMOLOGO',
      },
    },
    'dra.torres': {
      password: 'Ojitos2026*',
      auth: {
        tokenType: 'Bearer',
        expiresIn: 28800,
        id: 3,
        username: 'dra.torres',
        nombreCompleto: 'Carmen Torres',
        email: 'c.torres@clinicaojitos.pe',
        rol: 'OFTALMOLOGO',
      },
    },
    recepcion: {
      password: 'Ojitos2026*',
      auth: {
        tokenType: 'Bearer',
        expiresIn: 28800,
        id: 5,
        username: 'recepcion',
        nombreCompleto: 'Ana Recepción',
        email: 'recepcion@clinicaojitos.pe',
        rol: 'RECEPCIONISTA',
      },
    },
    paciente: {
      password: 'Ojitos2026*',
      auth: {
        tokenType: 'Bearer',
        expiresIn: 28800,
        id: 6,
        username: 'paciente',
        nombreCompleto: 'María Carmen González',
        email: 'maria.gonzalez@email.com',
        rol: 'PACIENTE',
      },
    },
  };

  // -------------------------------------------------------------- Pacientes
  readonly pacientes: Paciente[] = [
    {
      id: 1,
      nombres: 'María Carmen',
      apellidos: 'González',
      nombreCompleto: 'María Carmen González',
      documento: '45678912C',
      fechaNacimiento: '1956-04-18',
      edad: 68,
      telefono: '655 123 456',
      email: 'maria.g@email.com',
      direccion: 'Calle Mayor 14, 3ºB',
      seguro: 'Sanitas',
      grupoSanguineo: 'O+',
      antecedentesOculares: 'Cataratas leves (AO), presbicia',
      alergias: 'Penicilina, Latex (Leve)',
      activo: true,
      fechaRegistro: '2021-03-12',
    },
    {
      id: 2,
      nombres: 'Javier',
      apellidos: 'López Fernández',
      nombreCompleto: 'Javier López Fernández',
      documento: '12345678A',
      fechaNacimiento: '1984-09-02',
      edad: 42,
      telefono: '600 987 654',
      email: 'j.lopez@email.com',
      direccion: 'Avenida del Mar 8, 1ºA',
      seguro: 'Privado',
      grupoSanguineo: 'A+',
      antecedentesOculares: 'Miopía alta',
      alergias: '',
      activo: true,
      fechaRegistro: '2022-07-30',
    },
    {
      id: 3,
      nombres: 'Eleanor',
      apellidos: 'Vance',
      nombreCompleto: 'Eleanor Vance',
      documento: '84729-A',
      fechaNacimiento: '1954-01-22',
      edad: 72,
      telefono: '+34 911 445 220',
      email: 'eleanor.vance@email.com',
      direccion: 'Paseo de la Castellana 210',
      seguro: 'Adeslas',
      grupoSanguineo: 'B+',
      antecedentesOculares: 'Glaucoma de ángulo abierto (OD), glaucoma agudo (OI)',
      alergias: 'Sulfonamidas',
      activo: true,
      fechaRegistro: '2020-11-04',
    },
    {
      id: 4,
      nombres: 'Juan Antonio',
      apellidos: 'Pérez García',
      nombreCompleto: 'Juan Pérez',
      documento: '12345678A',
      fechaNacimiento: '1956-06-11',
      edad: 68,
      telefono: '+51 600 123 456',
      email: 'juan.perez@email.com',
      direccion: 'Calle Real 22, 4ºC',
      seguro: 'Sanitas Medical Premium',
      grupoSanguineo: 'O+',
      antecedentesOculares: 'Cataratas leves (AO), presbicia',
      alergias: 'Penicilina, Latex (Leve)',
      activo: true,
      fechaRegistro: '2019-05-20',
    },
    {
      id: 5,
      nombres: 'Sarah',
      apellidos: 'Jenkins',
      nombreCompleto: 'Sarah Jenkins',
      documento: 'OP-2023-0891',
      fechaNacimiento: '1980-12-04',
      edad: 42,
      telefono: '+51 600 456 789',
      email: 'sarah.jenkins@email.com',
      direccion: 'Av. Reforma 155',
      seguro: 'DKV',
      grupoSanguineo: 'O+',
      antecedentesOculares: 'Queratocono, ectasia corneal leve',
      alergias: '',
      activo: true,
      fechaRegistro: '2023-10-24',
    },
    {
      id: 6,
      nombres: 'María',
      apellidos: 'García Silva',
      nombreCompleto: 'María García S.',
      documento: '89456-A',
      fechaNacimiento: '1961-03-15',
      edad: 62,
      telefono: '+51 655 220 118',
      email: 'm.garcia@email.com',
      direccion: 'Calle Sol 5, 2ºD',
      seguro: 'Sanitas',
      grupoSanguineo: 'A+',
      antecedentesOculares: 'Glaucoma de Ángulo Abierto (Ojo Izquierdo)',
      alergias: '',
      activo: true,
      fechaRegistro: '2024-03-15',
    },
    {
      id: 7,
      nombres: 'María Elena',
      apellidos: 'Rodríguez',
      nombreCompleto: 'María Elena Rodríguez',
      documento: '48291',
      fechaNacimiento: '1968-07-08',
      edad: 58,
      telefono: '+34 622 118 940',
      email: 'maria.elena@email.com',
      direccion: 'Gran Vía 45, 5ºA',
      seguro: 'ADESLAS',
      grupoSanguineo: 'O+',
      antecedentesOculares: 'Glaucoma de ángulo abierto',
      alergias: '',
      activo: true,
      fechaRegistro: '2023-04-02',
    },
    {
      id: 8,
      nombres: 'Juan',
      apellidos: 'González',
      nombreCompleto: 'Juan González',
      documento: '77341-B',
      fechaNacimiento: '1970-02-19',
      edad: 56,
      telefono: '+34 611 220 774',
      email: 'juan.gonzalez@email.com',
      direccion: 'Calle Mayor 3',
      seguro: 'Mutua',
      grupoSanguineo: 'O-',
      antecedentesOculares: 'Catarata nuclear AO',
      alergias: '',
      activo: true,
      fechaRegistro: '2022-01-18',
    },
    {
      id: 9,
      nombres: 'Carlos',
      apellidos: 'Mendoza',
      nombreCompleto: 'Carlos Mendoza',
      documento: '33520-C',
      fechaNacimiento: '1975-11-30',
      edad: 50,
      telefono: '+34 633 887 100',
      email: 'c.mendoza@email.com',
      direccion: 'Avenida Castilla 91',
      seguro: 'Sanitas',
      grupoSanguineo: 'B+',
      antecedentesOculares: 'Retinopatía diabética no proliferativa',
      alergias: 'Metformina',
      activo: true,
      fechaRegistro: '2021-09-09',
    },
    {
      id: 10,
      nombres: 'Ana Lucía',
      apellidos: 'Torres',
      nombreCompleto: 'Ana Lucía Torres',
      documento: '22890-A',
      fechaNacimiento: '1990-05-06',
      edad: 36,
      telefono: '+34 644 112 903',
      email: 'ana.torres@email.com',
      direccion: 'Calle Mayor 77',
      seguro: 'DKV',
      grupoSanguineo: 'A+',
      antecedentesOculares: '',
      alergias: '',
      activo: true,
      fechaRegistro: '2024-06-11',
    },
    {
      id: 11,
      nombres: 'Roberto',
      apellidos: 'Gómez',
      nombreCompleto: 'Roberto Gómez',
      documento: '99120-D',
      fechaNacimiento: '1965-08-25',
      edad: 61,
      telefono: '+34 699 004 512',
      email: 'r.gomez@email.com',
      direccion: 'Rosalía de Castro 12',
      seguro: 'Privado',
      grupoSanguineo: 'O+',
      antecedentesOculares: 'Ojo seco severo',
      alergias: '',
      activo: true,
      fechaRegistro: '2020-05-14',
    },
    {
      id: 12,
      nombres: 'Ana',
      apellidos: 'Martínez',
      nombreCompleto: 'Ana Martínez',
      documento: '55120-B',
      fechaNacimiento: '1988-01-17',
      edad: 38,
      telefono: '+34 655 771 230',
      email: 'ana.martinez@email.com',
      direccion: 'Calle Pontevedra 8',
      seguro: 'Sanitas',
      grupoSanguineo: 'AB+',
      antecedentesOculares: 'Estrabismo infantil corregido',
      alergias: '',
      activo: true,
      fechaRegistro: '2023-02-27',
    },
  ];

  // ------------------------------------------------------- Oftalmólogos
  readonly oftalmologos: Oftalmologo[] = [
    {
      id: 1,
      nombres: 'Elena',
      apellidos: 'Rodríguez',
      nombreCompleto: 'Dr. Elena Rodríguez',
      iniciales: 'ER',
      email: 'elena.rodiguez@ojitos.com',
      telefono: '+51 800 123 456',
      numeroColegiatura: 'COL-89421',
      subespecialidad: 'Retina',
      sede: 'Clínica Principal (Centre)',
      activo: true,
      fotoUrl: '',
    },
    {
      id: 2,
      nombres: 'Marcus',
      apellidos: 'Silva',
      nombreCompleto: 'Dr. Marcus Silva',
      iniciales: 'MS',
      email: 'marcus.silva@ojitos.com',
      telefono: '+51 800 123 457',
      numeroColegiatura: 'COL-75319',
      subespecialidad: 'Córnea',
      sede: 'Clínica Principal (Centre)',
      activo: true,
      fotoUrl: '',
    },
    {
      id: 3,
      nombres: 'Arthur',
      apellidos: 'Chen',
      nombreCompleto: 'Dr. Arthur Chen',
      iniciales: 'AC',
      email: 'arthur.chen@ojitos.com',
      telefono: '+51 800 123 458',
      numeroColegiatura: 'COL-42108',
      subespecialidad: 'Glaucoma',
      sede: 'Clínica Norte',
      activo: false,
      fotoUrl: '',
    },
    {
      id: 4,
      nombres: 'Sarah',
      apellidos: 'Jenkins',
      nombreCompleto: 'Dra. Sarah Jenkins',
      iniciales: 'SJ',
      email: 'sarah.jenkins@ojitos.com',
      telefono: '+51 800 123 459',
      numeroColegiatura: 'COL-33201',
      subespecialidad: 'Pediátrica',
      sede: 'Clínica Principal (Centre)',
      activo: true,
      fotoUrl: '',
    },
    {
      id: 5,
      nombres: 'Carlos',
      apellidos: 'Mendoza',
      nombreCompleto: 'Dr. Carlos Mendoza',
      iniciales: 'CM',
      email: 'carlos.mendoza@ojitos.com',
      telefono: '+51 800 123 460',
      numeroColegiatura: 'COL-11745',
      subespecialidad: 'Retinología y Glaucoma',
      sede: 'Clínica Principal (Centre)',
      activo: true,
      fotoUrl: '',
    },
    {
      id: 6,
      nombres: 'Elena',
      apellidos: 'Torres',
      nombreCompleto: 'Dra. Elena Torres',
      iniciales: 'ET',
      email: 'elena.torres@ojitos.com',
      telefono: '+51 800 123 461',
      numeroColegiatura: 'COL-66789',
      subespecialidad: 'Catarata',
      sede: 'Clínica Norte',
      activo: true,
      fotoUrl: '',
    },
  ];

  readonly metricasPorOftalmologo: Record<number, MetricasOftalmologo> = {
    1: { pacientesAtendidos: 1240, citasSemana: 48, valoracionMedia: 4.9 },
    2: { pacientesAtendidos: 980, citasSemana: 41, valoracionMedia: 4.7 },
    3: { pacientesAtendidos: 610, citasSemana: 0, valoracionMedia: 4.4 },
    4: { pacientesAtendidos: 730, citasSemana: 35, valoracionMedia: 4.8 },
    5: { pacientesAtendidos: 1105, citasSemana: 46, valoracionMedia: 4.6 },
    6: { pacientesAtendidos: 845, citasSemana: 38, valoracionMedia: 4.8 },
  };

  /** Matriz de disponibilidad semanal usada por la pantalla de horarios (imagen 40). */
  readonly horarios: BloqueHorario[] = [
    { dia: 'LUNES', horaInicio: '09:00', horaFin: '12:00', tipo: 'DISPONIBLE' },
    { dia: 'MARTES', horaInicio: '09:00', horaFin: '12:00', tipo: 'DISPONIBLE' },
    { dia: 'MIERCOLES', horaInicio: '09:00', horaFin: '12:00', tipo: 'DISPONIBLE' },
    { dia: 'JUEVES', horaInicio: '15:00', horaFin: '20:00', tipo: 'DISPONIBLE' },
    { dia: 'VIERNES', horaInicio: '09:00', horaFin: '15:00', tipo: 'DISPONIBLE' },
  ];

  readonly horariosPorOftalmologo: Record<number, BloqueHorario[]> = {
    1: this.horarios,
    4: [
      { dia: 'LUNES', horaInicio: '09:00', horaFin: '14:00', tipo: 'DISPONIBLE' },
      { dia: 'MARTES', horaInicio: '09:00', horaFin: '14:00', tipo: 'DISPONIBLE' },
      { dia: 'MIERCOLES', horaInicio: '09:00', horaFin: '14:00', tipo: 'DISPONIBLE' },
      { dia: 'JUEVES', horaInicio: '15:00', horaFin: '20:00', tipo: 'DISPONIBLE' },
      { dia: 'VIERNES', horaInicio: '09:00', horaFin: '15:00', tipo: 'DISPONIBLE' },
    ],
  };

  // -------------------------------------------------------------- Historial
  /** Serie de PIO de Eleanor Vance mostrada en el gráfico de la imagen 27. */
  readonly evolucion: Record<number, PuntoEvolucion[]> = {
    3: [
      { fecha: '2023-07-15', pioOd: 18, pioOi: 19, agudezaOd: '20/30', agudezaOi: '20/40', diagnostico: 'Glaucoma primario de ángulo abierto' },
      { fecha: '2023-08-12', pioOd: 17, pioOi: 19, agudezaOd: '20/30', agudezaOi: '20/40', diagnostico: 'Glaucoma de ángulo abierto' },
      { fecha: '2023-09-16', pioOd: 18, pioOi: 17.5, agudezaOd: '20/25', agudezaOi: '20/30', diagnostico: 'Glaucoma de ángulo abierto' },
      { fecha: '2023-10-14', pioOd: 15, pioOi: 16, agudezaOd: '20/25', agudezaOi: '20/30', diagnostico: 'Ajuste de tratamiento' },
      { fecha: '2023-11-11', pioOd: 14, pioOi: 15, agudezaOd: '20/25', agudezaOi: '20/30', diagnostico: 'Respuesta favorable' },
      { fecha: '2023-12-09', pioOd: 13.5, pioOi: 14, agudezaOd: '20/25', agudezaOi: '20/30', diagnostico: 'Control estable' },
      { fecha: '2024-01-13', pioOd: 15, pioOi: 13, agudezaOd: '20/25', agudezaOi: '20/30', diagnostico: 'Variación estacional' },
      { fecha: '2024-02-10', pioOd: 14, pioOi: 13, agudezaOd: '20/25', agudezaOi: '20/30', diagnostico: 'Campos estables' },
    ],
  };

  readonly consultas: Record<number, Consulta[]> = {
    5: [
      {
        id: 501,
        pacienteId: 5,
        pacienteNombre: 'Sarah Jenkins',
        fecha: '24 de octubre de 2023',
        hora: '10:30',
        motivo: 'Control de retinopatía diabética',
        tipoConsulta: 'Revisión',
        diagnosticoPrincipal: 'Tomografía OCT - Estable',
        agudezaOd: '20/25',
        agudezaOi: '20/30',
        pioOd: 15,
        pioOi: 14,
        pupilas: 'Isocóricas, reactivas',
        biomicroscopia: 'Sin lesiones inflamatorias',
        fondoOjo: 'Sin hemorragias ni exudados',
        notasSubjectivo:
          'Paciente acude para tomografía OCT de control para evaluar el grosor macular. Los resultados no muestran cambios significativos desde la última visita.',
        notasObjetivo:
          'El contorno macular se mantiene estable respecto al último escaneo. No se observan cambios significativos.',
        notasEvaluacion: 'Estable. Se recomienda continuar con el tratamiento actual.',
        notasPlan:
          'Se recomienda continuar con el tratamiento actual y volver para control anual regular, salvo que aparezcan nuevos síntomas.',
        oftalmologoId: 1,
        oftalmologoNombre: 'Dr. Elena Rodríguez',
        archivos: [],
        esUltima: true,
      },
      {
        id: 502,
        pacienteId: 5,
        pacienteNombre: 'Sarah Jenkins',
        fecha: '15 de marzo de 2023',
        hora: '09:15',
        motivo: 'Chequeo de rutina - Miopía leve',
        tipoConsulta: 'Chequeo de rutina',
        diagnosticoPrincipal: 'Chequeo de retina - Miopía leve',
        agudezaOd: '20/25',
        agudezaOi: '20/30',
        pioOd: 14,
        pioOi: 13,
        pupilas: 'Isocóricas, reactivas',
        biomicroscopia: 'Sin lesiones',
        fondoOjo: 'Normal',
        notasSubjectivo:
          'Evaluación general de agudeza visual. El paciente refiere visión ligeramente borrosa al conducir de noche. La refracción muestra una leve variación miópica (-0.50 en OD, +0.25 en AO).',
        notasObjetivo: 'Presbicia incipiente dentro del rango normal (14 mmHg en AO).',
        notasEvaluacion: 'Sin signos de retinopatía retiniana.',
        notasPlan: 'Actualizar receta. Control en 6 meses.',
        oftalmologoId: 1,
        oftalmologoNombre: 'Dr. James Chen',
        archivos: [{ id: 1, nombre: 'Prescription_Re_Mar2023.pdf', tipo: 'PDF', url: '' }],
        esUltima: false,
      },
    ],
  };

  readonly actividadReciente: Record<number, ActividadReciente[]> = {
    4: [
      { tipo: 'EXAMEN', titulo: 'Chequeo de rutina', detalle: 'Dr. Martínez', fecha: 'Oct 12, 2023' },
      { tipo: 'EXAMEN', titulo: 'Tomografía OCT', detalle: 'Lab Tech. Suarez', fecha: 'Sep 05, 2023' },
    ],
    3: [
      { tipo: 'CONSULTA', titulo: 'Control de glaucoma', detalle: 'Dr. Elena Rodríguez', fecha: 'Feb 10, 2024' },
      { tipo: 'TRATAMIENTO', titulo: 'Latanoprost 0.005%', detalle: 'Receta activa', fecha: 'Jan 13, 2024' },
      { tipo: 'EXAMEN', titulo: 'Campo visual Humphrey', detalle: 'Lab Tech. Suarez', fecha: 'Dec 09, 2023' },
    ],
  };

  // ------------------------------------------------------------ Tratamientos
  readonly tratamientos: Record<number, Tratamiento[]> = {
    3: [
      {
        id: 701,
        pacienteId: 3,
        pacienteNombre: 'Eleanor Vance',
        tipo: 'MEDICACION',
        medicamento: 'Latanoprost 0.005%',
        dosis: '1 gota',
        frecuencia: '1 gota en AO antes de dormir',
        duracion: 'Indefinido',
        instrucciones: 'Aplicar una gota en cada ojo antes de dormir. Lavar las manos antes de la aplicación.',
        fechaInicio: '15 Oct, 2021',
        fechaFin: 'Indefinido',
        estado: 'ACTIVO',
      },
      {
        id: 702,
        pacienteId: 3,
        pacienteNombre: 'Eleanor Vance',
        tipo: 'MEDICACION',
        medicamento: 'Timolol 0.5%',
        dosis: '1 gota',
        frecuencia: '1 gota en AO cada mañana',
        duracion: 'Indefinido',
        instrucciones: 'Alternar con Latanoprost según indicación médica.',
        fechaInicio: '15 Oct, 2021',
        fechaFin: 'Indefinido',
        estado: 'ACTIVO',
      },
    ],
  };

  readonly controles: Record<number, ControlTratamiento[]> = {
    701: [
      {
        id: 901,
        tratamientoId: 701,
        fecha: '15 Abr, 2024',
        resultado: 'Mejora',
        pioOd: 14,
        pioOi: 16,
        observaciones: 'Paciente reporta buena tolerancia a las gotas nocturnas. La PIO se mantiene estable.',
      },
      {
        id: 902,
        tratamientoId: 701,
        fecha: '15 Mar, 2024',
        resultado: 'Completado',
        pioOd: 16,
        pioOi: 17,
        observaciones: 'Control inicial tras inicio del tratamiento.',
      },
    ],
  };

  /** Línea de tiempo de 6 meses de la pantalla de seguimiento (imagen 35). */
  readonly hitosSeguimiento: Record<number, HitoControl[]> = {
    6: [
      { id: 1, etiqueta: 'Control Inicial', fecha: '15 Mar 2024', estado: 'COMPLETADO', resumen: 'PIO 16/17 mmHg. Se inicia Latanoprost 0.005%.' },
      { id: 2, etiqueta: 'Revisión 1 Mes', fecha: '15 Abr 2024', estado: 'MEJORA', resumen: 'PIO 14/16 mmHg. Reducción de la PIO en ojo izquierdo.' },
      { id: 3, etiqueta: 'Revisión 3 Meses', fecha: '15 Jun 2024', estado: 'SIN_CAMBIOS', resumen: 'PIO estable en 14/15 mmHg. Sin nuevas lesiones.' },
      { id: 4, etiqueta: 'Revisión 6 Meses', fecha: '15 Sep 2024', estado: 'PENDIENTE', resumen: 'Programada.' },
    ],
  };

  readonly cirugias = [
    {
      id: 1001,
      pacienteId: 9,
      pacienteNombre: 'Carlos Mendoza',
      diagnosticoPreoperatorio: 'Catarata nuclear, OD',
      tipoCirugia: 'Facoemulsificación',
      fecha: '2024-04-18',
      lateralidad: 'OD' as const,
      tipoAnestesia: 'Tópica',
      reporteOperatorio: '',
      estado: 'PROGRAMADA' as const,
    },
  ];

  // ----------------------------------------------------------------- Citas
  readonly citas: Cita[] = [
    {
      id: 2001, pacienteId: 7, pacienteNombre: 'María Elena Rodríguez', documentoPaciente: '48291', telefonoPaciente: '+34 622 118 940',
      oftalmologoId: 5, oftalmologoNombre: 'Dr. Carlos Mendoza', fecha: '2026-10-24', horaInicio: '10:30', horaFin: '11:00',
      tipoConsulta: 'Revisión de Glaucoma', motivo: 'Control de PIO', estadoCita: 'CONFIRMADA', notas: '', motivoCancelacion: '',
    },
    {
      id: 2002, pacienteId: 8, pacienteNombre: 'Juan González', documentoPaciente: '77341-B', telefonoPaciente: '+34 611 220 774',
      oftalmologoId: 5, oftalmologoNombre: 'Dr. Carlos Mendoza', fecha: '2026-10-24', horaInicio: '11:45', horaFin: '12:15',
      tipoConsulta: 'Primera Visita', motivo: 'Evaluación inicial', estadoCita: 'PROGRAMADA', notas: '', motivoCancelacion: '',
    },
    {
      id: 2003, pacienteId: 9, pacienteNombre: 'Roberto Gómez', documentoPaciente: '99120-D', telefonoPaciente: '+34 699 004 512',
      oftalmologoId: 5, oftalmologoNombre: 'Dr. Carlos Mendoza', fecha: '2026-10-27', horaInicio: '09:15', horaFin: '09:45',
      tipoConsulta: 'Seguimiento Post-op', motivo: 'Control postoperatorio', estadoCita: 'CONFIRMADA', notas: '', motivoCancelacion: '',
    },
    {
      id: 2011, pacienteId: 3, pacienteNombre: 'Eleanor Vance', documentoPaciente: '84729-A', telefonoPaciente: '+34 911 445 220',
      oftalmologoId: 1, oftalmologoNombre: 'Dr. Elena Rodríguez', fecha: '2026-10-24', horaInicio: '09:00', horaFin: '10:00',
      tipoConsulta: 'Examen Integral', motivo: 'Examen anual', estadoCita: 'CONFIRMADA', notas: '', motivoCancelacion: '',
    },
    {
      id: 2012, pacienteId: 1, pacienteNombre: 'María Carmen González', documentoPaciente: '45678912C', telefonoPaciente: '655 123 456',
      oftalmologoId: 1, oftalmologoNombre: 'Dr. Elena Rodríguez', fecha: '2026-10-24', horaInicio: '11:00', horaFin: '11:30',
      tipoConsulta: 'Examen de Visión', motivo: 'Chequeo visual', estadoCita: 'CANCELADA', notas: 'Paciente reprogramará', motivoCancelacion: 'El paciente no puede asistir',
    },
    {
      id: 2013, pacienteId: 10, pacienteNombre: 'Ana Lucía Torres', documentoPaciente: '22890-A', telefonoPaciente: '+34 644 112 903',
      oftalmologoId: 1, oftalmologoNombre: 'Dr. Elena Rodríguez', fecha: '2026-10-25', horaInicio: '13:00', horaFin: '13:45',
      tipoConsulta: 'Revisión Retina', motivo: 'Revisión de retina', estadoCita: 'CONFIRMADA', notas: '', motivoCancelacion: '',
    },
    {
      id: 2014, pacienteId: 2, pacienteNombre: 'Javier López Fernández', documentoPaciente: '12345678A', telefonoPaciente: '600 987 654',
      oftalmologoId: 2, oftalmologoNombre: 'Dr. Marcus Silva', fecha: '2026-10-26', horaInicio: '10:00', horaFin: '10:30',
      tipoConsulta: 'Consulta de Cataratas', motivo: 'Dificultad visión nocturna', estadoCita: 'CONFIRMADA', notas: '', motivoCancelacion: '',
    },
    {
      id: 2015, pacienteId: 6, pacienteNombre: 'María García S.', documentoPaciente: '89456-A', telefonoPaciente: '+51 655 220 118',
      oftalmologoId: 2, oftalmologoNombre: 'Dr. Marcus Silva', fecha: '2026-10-27', horaInicio: '09:00', horaFin: '09:30',
      tipoConsulta: 'Control de Glaucoma', motivo: 'Control mensual', estadoCita: 'CONFIRMADA', notas: '', motivoCancelacion: '',
    },
    {
      id: 2016, pacienteId: 11, pacienteNombre: 'Roberto Gómez', documentoPaciente: '99120-D', telefonoPaciente: '+34 699 004 512',
      oftalmologoId: 2, oftalmologoNombre: 'Dr. Marcus Silva', fecha: '2026-10-27', horaInicio: '13:00', horaFin: '13:30',
      tipoConsulta: 'Urgencia', motivo: 'Dolor ocular agudo', estadoCita: 'PROGRAMADA', notas: '', motivoCancelacion: '',
    },
    {
      id: 2017, pacienteId: 12, pacienteNombre: 'Ana Martínez', documentoPaciente: '55120-B', telefonoPaciente: '+34 655 771 230',
      oftalmologoId: 6, oftalmologoNombre: 'Dra. Elena Torres', fecha: '2026-10-27', horaInicio: '14:00', horaFin: '14:30',
      tipoConsulta: 'Revisión Post-Operatoria', motivo: 'Postoperatorio catarata', estadoCita: 'CONFIRMADA', notas: '', motivoCancelacion: '',
    },
  ];

  /** Franjas del calendario semanal de la imagen 30 (lunes 19 – viernes 23 oct 2026). */
  readonly eventosAgenda: EventoAgenda[] = [
    { id: 2011, titulo: 'Examen Integral', detalle: 'Eleanor Vance · 60 min', fecha: '2026-10-20', horaInicio: '08:00', horaFin: '09:00', estadoCita: 'CONFIRMADA', pacienteId: 3, oftalmologoNombre: 'Dr. Elena Rodríguez', tipoConsulta: 'Examen Integral' },
    { id: 2012, titulo: 'Examen de Visión', detalle: 'María Carmen González · 30 min', fecha: '2026-10-19', horaInicio: '11:00', horaFin: '11:30', estadoCita: 'CANCELADA', pacienteId: 1, oftalmologoNombre: 'Dr. Elena Rodríguez', tipoConsulta: 'Examen de Visión' },
    { id: 2013, titulo: 'Revisión Retina', detalle: 'Ana Lucía Torres · 45 min', fecha: '2026-10-22', horaInicio: '10:00', horaFin: '10:45', estadoCita: 'CONFIRMADA', pacienteId: 10, oftalmologoNombre: 'Dr. Elena Rodríguez', tipoConsulta: 'Revisión Retina' },
    { id: 2014, titulo: 'Seguimiento', detalle: 'Post-Op · 30 min', fecha: '2026-10-19', horaInicio: '09:00', horaFin: '09:30', estadoCita: 'PROGRAMADA', pacienteId: 9, oftalmologoNombre: 'Dr. Elena Rodríguez', tipoConsulta: 'Seguimiento' },
    { id: 2015, titulo: 'Descarte de Glaucoma', detalle: 'Juan González · 45 min', fecha: '2026-10-20', horaInicio: '09:00', horaFin: '09:45', estadoCita: 'CONFIRMADA', pacienteId: 8, oftalmologoNombre: 'Dr. Elena Rodríguez', tipoConsulta: 'Descarte de Glaucoma' },
    { id: 2016, titulo: 'Consulta de Cataratas', detalle: 'Javier López · 30 min', fecha: '2026-10-22', horaInicio: '12:00', horaFin: '12:30', estadoCita: 'CONFIRMADA', pacienteId: 2, oftalmologoNombre: 'Dr. Elena Rodríguez', tipoConsulta: 'Consulta de Cataratas' },
    { id: 2017, titulo: 'Seguimiento', detalle: 'Control Glaucoma · 30 min', fecha: '2026-10-21', horaInicio: '13:00', horaFin: '13:30', estadoCita: 'CONFIRMADA', pacienteId: 6, oftalmologoNombre: 'Dr. Elena Rodríguez', tipoConsulta: 'Seguimiento' },
    { id: 2018, titulo: 'Urgencia', detalle: 'Ana Martínez · 45 min', fecha: '2026-10-23', horaInicio: '13:00', horaFin: '13:45', estadoCita: 'PROGRAMADA', pacienteId: 12, oftalmologoNombre: 'Dr. Elena Rodríguez', tipoConsulta: 'Urgencia' },
  ];

  /** Horarios del 14 de octubre de 2023 mostrados en la pantalla de reserva (imagen 32). */
  readonly disponibilidad: Record<string, SlotDisponibilidad[]> = {
    '2023-10-14': [
      { horaInicio: '09:00', horaFin: '09:30', estado: 'FREE' },
      { horaInicio: '09:30', horaFin: '10:00', estado: 'BOOKED' },
      { horaInicio: '10:00', horaFin: '10:30', estado: 'FREE' },
      { horaInicio: '10:30', horaFin: '11:00', estado: 'BOOKED' },
      { horaInicio: '11:00', horaFin: '11:30', estado: 'FREE' },
      { horaInicio: '11:30', horaFin: '12:00', estado: 'FREE' },
      { horaInicio: '13:00', horaFin: '13:30', estado: 'FREE' },
      { horaInicio: '13:30', horaFin: '14:00', estado: 'FREE' },
      { horaInicio: '14:00', horaFin: '14:30', estado: 'BOOKED' },
      { horaInicio: '14:30', horaFin: '15:00', estado: 'FREE' },
    ],
    default: [
      { horaInicio: '09:00', horaFin: '09:30', estado: 'FREE' },
      { horaInicio: '09:30', horaFin: '10:00', estado: 'BOOKED' },
      { horaInicio: '10:00', horaFin: '10:30', estado: 'FREE' },
      { horaInicio: '10:30', horaFin: '11:00', estado: 'BOOKED' },
      { horaInicio: '11:00', horaFin: '11:30', estado: 'FREE' },
      { horaInicio: '11:30', horaFin: '12:00', estado: 'FREE' },
    ],
  };

  // ------------------------------------------------------------- Dashboards
  readonly dashboardAdmin: DashboardAdmin = {
    totalPacientes: 14208,
    citasHoy: 84,
    oftalmologosActivos: 12,
    volumenPacientes: [
      { etiqueta: 'Ene', total: 980, destacado: false },
      { etiqueta: 'Feb', total: 1420, destacado: false },
      { etiqueta: 'Mar', total: 1950, destacado: false },
      { etiqueta: 'Abr', total: 1680, destacado: false },
      { etiqueta: 'May', total: 2410, destacado: true },
      { etiqueta: 'Jun', total: 1120, destacado: false },
    ],
    intentosAcceso: [
      { usuario: 'Dr. Elena Rostova', ip: '192.168.1.45', hora: '10:42 AM', resultado: 'EXITOSO' },
      { usuario: 'Admin_Main', ip: '10.0.0.12', hora: '09:15 AM', resultado: 'EXITOSO' },
      { usuario: 'Usuario Desconocido', ip: '45.33.22.11', hora: '08:03 AM', resultado: 'FALLIDO' },
    ],
  };

  readonly dashboardMedico: DashboardMedico = {
    fecha: 'Jueves, 26 de Octubre',
    citasHoy: [
      { id: 1, horaInicio: '09:00', horaFin: '10:00', pacienteNombre: 'María Luisa Fernández', motivo: 'Revisión Post-operatoria (Cataratas)', tipoConsulta: 'Revisión', estado: 'CONFIRMADA', sala: 'Sala 1' },
      { id: 2, horaInicio: '10:30', horaFin: '11:00', pacienteNombre: 'Carlos Mendoza', motivo: 'Consulta General - Presbicia', tipoConsulta: 'Consulta', estado: 'EN_ESPERA', sala: 'Sala 2' },
    ],
    pendientes: [
      { id: 1, titulo: 'Revisar OCT - L. Gómez', detalle: 'Miopatía diabética · sospechosa', icono: 'clipboard-list' },
      { id: 2, titulo: 'Renovar Receta - J. Silva', detalle: 'Gotas Glaucoma', icono: 'clipboard-list' },
    ],
    historialesRecientes: [
      { id: 1, iniciales: 'AM', pacienteNombre: 'Ana M.', hora: '09:15' },
      { id: 2, iniciales: 'RC', pacienteNombre: 'Roberto C.', hora: '08:40' },
    ],
  };

  readonly dashboardRecepcion: DashboardRecepcion = {
    totalCitas: 12,
    enEspera: 4,
    citasHoy: [
      { id: 1, horaInicio: '09:00', horaFin: '09:30', pacienteNombre: 'María González', motivo: 'Revisión General', tipoConsulta: 'General', estado: 'EN_ESPERA' },
      { id: 2, horaInicio: '09:30', horaFin: '10:00', pacienteNombre: 'Carlos Ruiz', motivo: 'Seguimiento Glaucoma', tipoConsulta: 'Glaucoma', estado: 'PROGRAMADA' },
      { id: 3, horaInicio: '10:00', horaFin: '10:15', pacienteNombre: 'Ana Martínez', motivo: 'Cirugía Láser (Pre)', tipoConsulta: 'Láser', estado: 'PROGRAMADA' },
      { id: 4, horaInicio: '10:15', horaFin: '11:00', pacienteNombre: 'Roberto Gómez', motivo: 'Examen Visual', tipoConsulta: 'Visual', estado: 'EN_CURSO' },
    ],
    medicos: [
      { id: 2, nombreCompleto: 'Dr. A. Silva', iniciales: 'AS', subespecialidad: 'Córnea', estado: 'OCUPADO', detalle: 'hasta 10:45 AM' },
      { id: 6, nombreCompleto: 'Dra. M. Vega', iniciales: 'MV', subespecialidad: 'General', estado: 'DISPONIBLE', detalle: 'Consultorio 3' },
    ],
    avisos: [
      { icono: 'info', texto: 'El equipo OCT en sala 2 está en mantenimiento hasta las 11:00 AM.' },
      { icono: 'alert-triangle', texto: '2 pacientes requieren actualización de seguro médico hoy.' },
    ],
  };

  readonly dashboardPaciente: DashboardPaciente = {
    nombre: 'María',
    citas: [
      { id: 1, horaInicio: '10:30 AM', horaFin: '', pacienteNombre: '', motivo: 'Revisión General - Glaucoma', tipoConsulta: 'Revisión', estado: 'CONFIRMADA' },
      { id: 2, horaInicio: '09:00 AM', horaFin: '', pacienteNombre: '', motivo: 'Examen de Retina', tipoConsulta: 'Examen', estado: 'PROGRAMADA' },
    ],
    diagnosticos: [
      { nombre: 'Glaucoma de ángulo abierto', ojo: 'Ojo derecho e izquierdo', ultimaActualizacion: '15 Sep 2023', estado: 'ESTABLE' },
      { nombre: 'Presbicia', ojo: 'Corrección con lentes actualizada', ultimaActualizacion: '10 Feb 2023', estado: 'EN_SEGUIMIENTO' },
    ],
  };

  readonly mensajesPortal: MensajePortal[] = [
    { id: 1, remitente: 'Dra. Elena Torres', mensaje: 'Buenos días, hemos recibido sus resultados del OCT. Todo está dentro de lo esperado.', fecha: '12 Feb 2024 · 09:20', leido: false },
    { id: 2, remitente: 'Recepción Clínica', mensaje: 'Su cita del próximo mes ha sido confirmada. Recuerde traer su documentación.', fecha: '05 Feb 2024 · 16:45', leido: true },
  ];

  // -------------------------------------------------------------- Catálogos
  readonly catalogos: Record<string, CatalogoItem[]> = {
    'tipos-consulta': [
      { id: 1, codigo: 'CONS-GEN', nombre: 'Consulta General', activo: true },
      { id: 2, codigo: 'REV-GLAU', nombre: 'Revisión de Glaucoma', activo: true },
      { id: 3, codigo: 'EXAM-VIS', nombre: 'Examen de Visión', activo: true },
      { id: 4, codigo: 'CTRL-POST', nombre: 'Control Post-operatorio', activo: true },
      { id: 5, codigo: 'URG', nombre: 'Urgencia', activo: true },
    ],
    subespecialidades: [
      { id: 1, codigo: 'RET', nombre: 'Retina', activo: true },
      { id: 2, codigo: 'COR', nombre: 'Córnea', activo: true },
      { id: 3, codigo: 'GLAU', nombre: 'Glaucoma', activo: true },
      { id: 4, codigo: 'CAT', nombre: 'Catarata', activo: true },
      { id: 5, codigo: 'PED', nombre: 'Pediátrica', activo: true },
    ],
    'tipos-tratamiento': [
      { id: 1, codigo: 'MED', nombre: 'Medicación', activo: true },
      { id: 2, codigo: 'LENT', nombre: 'Lentes', activo: true },
      { id: 3, codigo: 'TER', nombre: 'Terapia', activo: true },
      { id: 4, codigo: 'CIR', nombre: 'Cirugía', activo: true },
    ],
    'tipos-examen': [
      { id: 1, codigo: 'OCT', nombre: 'Tomografía OCT', activo: true },
      { id: 2, codigo: 'FUND', nombre: 'Fotografía de Fondo de Ojo', activo: true },
      { id: 3, codigo: 'CAMP', nombre: 'Campo Visual', activo: true },
    ],
    seguros: [
      { id: 1, codigo: 'SAN', nombre: 'Sanitas', activo: true },
      { id: 2, codigo: 'ADE', nombre: 'Adeslas', activo: true },
      { id: 3, codigo: 'DKV', nombre: 'DKV', activo: true },
      { id: 4, codigo: 'PRIV', nombre: 'Privado', activo: true },
      { id: 5, codigo: 'MUT', nombre: 'Mutua', activo: true },
    ],
  };

  /** Fármacos oftálmicos sugeridos por el buscador de la pantalla de prescripción. */
  readonly farmacos = [
    'Latanoprost 0.005%',
    'Timolol 0.5%',
    'Tobramicina 0.3%',
    'Bimatoprost 0.01%',
    'Fluoresceína sódica',
    'Prednisona acetato 1%',
    'Ciprofloxacino 0.3%',
  ];

  /** Escala Snellen en uso en el sistema para la agudeza visual. */
  readonly escalaAgudeza = ['20/20', '20/25', '20/30', '20/40', '20/50', '20/100', '20/200', 'CD'];

  readonly tiposCirugia = [
    'Facoemulsificación',
    'Cirugía de glaucoma (trabeculoplastia)',
    'Vitrectomía',
    'Queratoplastia',
    'Estrabismo',
    'Blefaroplastia',
  ];

  // ------------------------------------------------------------- Utilidades
  /** Iniciales (máx. 2) a partir de un nombre completo, para los avatares. */
  iniciales(nombre: string): string {
    return nombre
      .replace(/^(Dr\.|Dra\.)\s*/i, '')
      .split(/\s+/)
      .filter((p) => p.length > 0)
      .slice(0, 2)
      .map((p) => p[0].toUpperCase())
      .join('');
  }

  /** Proyecta un paciente sobre la fila plana que consume la tabla de la imagen 24. */
  aFilaListado(p: Paciente): PacienteListItem {
    return {
      id: p.id,
      nombreCompleto: p.nombreCompleto,
      iniciales: this.iniciales(p.nombreCompleto),
      documento: p.documento,
      edad: p.edad,
      telefono: p.telefono,
      email: p.email,
      seguro: p.seguro,
    };
  }

  disponibilidadDe(fecha: string): SlotDisponibilidad[] {
    return this.disponibilidad[fecha] ?? this.disponibilidad['default'];
  }

  /** Últimas consultas de un paciente; el prototipo muestra hasta 10 por página. */
  consultasDe(pacienteId: number): Consulta[] {
    return this.consultas[pacienteId] ?? [];
  }

  evolucionDe(pacienteId: number): PuntoEvolucion[] {
    return this.evolucion[pacienteId] ?? [];
  }

  tratamientosDe(pacienteId: number): Tratamiento[] {
    return this.tratamientos[pacienteId] ?? [];
  }

  controlesDe(tratamientoId: number): ControlTratamiento[] {
    return this.controles[tratamientoId] ?? [];
  }

  hitosDe(pacienteId: number): HitoControl[] {
    return this.hitosSeguimiento[pacienteId] ?? [];
  }

  catalogo(nombre: string): CatalogoItem[] {
    return this.catalogos[nombre] ?? [];
  }

  /** Fármaco sin fotos de fondo de ojo: el prototipo adjunta `fondo_OD_2023.jpg`. */
  nuevoExamen(_p: ExamenRequest): void {
    // El mock no persiste adjuntos; devuelve un no-op explícito.
  }
}