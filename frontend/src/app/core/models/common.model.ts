/** Envoltorio paginado estándar devuelto por los endpoints de Spring Data. */
export interface PageResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
  first: boolean;
  last: boolean;
}

/** Cuerpo de error uniforme producido por `GlobalExceptionHandler`. */
export interface ApiError {
  timestamp: string;
  status: number;
  error: string;
  message: string;
  path: string;
}

/** Roles del sistema. El control de acceso real vive en el backend. */
export type Rol = 'ADMINISTRADOR' | 'OFTALMOLOGO' | 'RECEPCIONISTA' | 'PACIENTE';

export const ROLES: Rol[] = ['ADMINISTRADOR', 'OFTALMOLOGO', 'RECEPCIONISTA', 'PACIENTE'];

/** Respuesta genérica de los endpoints que solo devuelven un mensaje. */
export interface MensajeRespuesta {
  mensaje: string;
}
/**
 * Credenciales de acceso de una cuenta recién creada.
 *
 * <p>La contraseña se devuelve <strong>una sola vez</strong>, en la respuesta del
 * alta: en la base solo queda su hash BCrypt y no es recuperable. Se usa tanto
 * para el alta de un oftalmólogo como para la de un paciente.
 */
export interface Credenciales {
  username: string;
  password: string;
  nombreCompleto: string;
  textoParaDescargar: string;
}