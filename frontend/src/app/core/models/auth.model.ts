import { Rol } from './common.model';

/** Token y perfil devueltos por `/auth/login`, `/auth/refresh` y `/auth/me`. */
export interface AuthResponse {
  accessToken: string;
  tokenType: string;
  expiresIn: number;
  id: number;
  username: string;
  nombreCompleto: string;
  email: string;
  rol: Rol;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface RefreshRequest {
  refreshToken: string;
}

export interface RecuperarClaveRequest {
  email: string;
}