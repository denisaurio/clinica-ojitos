/**
 * Mapa estático de los módulos funcionales y sus dependencias.
 *
 * El informe lo imprime para responder «qué módulo se relaciona con qué»,
 * y el runner lo usa para describir el propósito de cada prueba.
 */
export const MODULOS = [
  {
    nombre: 'contrato',
    titulo: 'Contrato API ↔ Frontend',
    descripcion: 'Verificación estática de rutas, DTOs y variables de entorno.',
    relaciones: ['todos'],
    dependencias: [],
  },
  {
    nombre: 'auth',
    titulo: 'Autenticación y sesión',
    descripcion: 'Login, token JWT, perfil y rechazo de credenciales inválidas.',
    relaciones: ['pacientes', 'citas', 'tratamientos', 'historial', 'dashboards', 'admin'],
    dependencias: ['contrato'],
  },
  {
    nombre: 'catalogo',
    titulo: 'Catálogos clínicos',
    descripcion: 'Tipos de consulta, ojos, días, bloques de horario y estados.',
    relaciones: ['citas', 'tratamientos', 'oftalmologos'],
    dependencias: ['auth'],
  },
  {
    nombre: 'estado',
    titulo: 'Estado del servicio',
    descripcion: 'Health check público usado por el despliegue.',
    relaciones: [],
    dependencias: ['contrato'],
  },
  {
    nombre: 'pacientes',
    titulo: 'Pacientes',
    descripcion: 'Alta, búsqueda, ficha, duplicados y baja lógica.',
    relaciones: ['historial', 'citas', 'tratamientos', 'dashboards'],
    dependencias: ['auth', 'catalogo'],
  },
  {
    nombre: 'oftalmologos',
    titulo: 'Oftalmólogos y horarios',
    descripcion: 'Directorio, ficha, matriz de horarios y métricas.',
    relaciones: ['citas', 'tratamientos', 'catalogo'],
    dependencias: ['auth', 'catalogo'],
  },
  {
    nombre: 'historial',
    titulo: 'Historial clínico',
    descripcion: 'Consultas, evolución de PIO y diagnósticos vigentes.',
    relaciones: ['pacientes', 'citas', 'tratamientos'],
    dependencias: ['auth', 'pacientes'],
  },
  {
    nombre: 'citas',
    titulo: 'Citas y agenda',
    descripcion: 'Disponibilidad, alta, cambio de estado, reprogramación y baja.',
    relaciones: ['pacientes', 'oftalmologos', 'catalogo', 'dashboards'],
    dependencias: ['auth', 'catalogo', 'pacientes', 'oftalmologos'],
  },
  {
    nombre: 'tratamientos',
    titulo: 'Tratamientos y cirugías',
    descripcion: 'Prescripción, seguimiento, controles y registro quirúrgico.',
    relaciones: ['pacientes', 'oftalmologos', 'catalogo', 'historial'],
    dependencias: ['auth', 'catalogo', 'pacientes', 'oftalmologos'],
  },
  {
    nombre: 'dashboards',
    titulo: 'Paneles por rol',
    descripcion: 'Indicadores de administrador, recepción, médico y paciente.',
    relaciones: ['pacientes', 'citas', 'tratamientos', 'oftalmologos'],
    dependencias: ['auth'],
  },
  {
    nombre: 'admin',
    titulo: 'Auditoría',
    descripcion: 'Bitácora de accesos y trazabilidad por paciente.',
    relaciones: ['auth', 'pacientes', 'historial'],
    dependencias: ['auth'],
  },
  {
    nombre: 'seguridad',
    titulo: 'Seguridad y pertenencia',
    descripcion: 'RBAC por rol, aislamiento del paciente y cierre de la fuga de agenda.',
    relaciones: ['auth', 'pacientes', 'historial', 'citas', 'tratamientos', 'admin'],
    dependencias: ['auth', 'pacientes'],
  },
  {
    nombre: 'flujo-completo',
    titulo: 'Flujo clínico de punta a punta',
    descripcion: 'Paciente → cita → tratamiento → cirugía → historial → panel.',
    relaciones: [
      'catalogo',
      'pacientes',
      'oftalmologos',
      'citas',
      'tratamientos',
      'historial',
      'dashboards',
      'seguridad',
    ],
    dependencias: ['auth', 'pacientes', 'citas', 'tratamientos'],
  },
];

export function moduloPorNombre(nombre) {
  return MODULOS.find((modulo) => modulo.nombre === nombre);
}
