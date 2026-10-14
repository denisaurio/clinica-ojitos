import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { Observable, defer, of, throwError } from 'rxjs';
import { delay, tap } from 'rxjs/operators';

import { environment } from '../../../environments/environment';
import { AuthResponse, LoginRequest, MensajeRespuesta, RecuperarClaveRequest, Rol } from '../models';
import { DemoDataService } from './demo-data.service';

const TOKEN_KEY = 'ojitos_access_token';
const USUARIO_KEY = 'ojitos_usuario';

/**
 * Estado de sesión del portal.
 *
 * Expone el rol como signal para que `roleGuard` y la barra lateral reaccional
 * sin necesidad de observables. La autorización real la aplica el backend:
 * ocultar un enlace no sustituye al filtro del servidor.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly demo = inject(DemoDataService);
  private readonly router = inject(Router);

  private readonly _usuario = signal<AuthResponse | null>(this.leerDeAlmacenamiento());

  /** Sesión actual; `null` cuando no hay nadie autenticado. */
  readonly usuario = this._usuario.asReadonly();

  /** Rol actual, usado por `roleGuard` y por el menú lateral. */
  readonly rol = computed<Rol | null>(() => this._usuario()?.rol ?? null);

  readonly autenticado = computed(() => this._usuario() !== null);

  readonly token = computed(() => this._usuario()?.accessToken ?? null);

  readonly nombreCompleto = computed(() => this._usuario()?.nombreCompleto ?? '');

  /** `true` cuando el usuario solo puede leer su propia información. */
  readonly esPaciente = computed(() => this.rol() === 'PACIENTE');

  login(credentials: LoginRequest): Observable<AuthResponse> {
    if (environment.useMockApi) {
      // `defer` convierte el error del mock en una notificacion del observable.
      // Sin el, `loginEnMock` lanzaria de forma sincrona antes de crearse el
      // observable, el `error` del componente no se ejecutaria nunca y el
      // boton se quedaria cargando indefinidamente.
      return defer(() => of(this.loginEnMock(credentials))).pipe(delay(350));
    }

    return this.http
      .post<AuthResponse>(`${environment.apiUrl}/auth/login`, credentials)
      .pipe(tap((respuesta) => this.persistir(respuesta)));
  }

  me(): Observable<AuthResponse> {
    if (environment.useMockApi) {
      const usuario = this._usuario();
      return usuario ? of(usuario).pipe(delay(80)) : throwError(() => new Error('Sin sesión activa'));
    }
    return this.http.get<AuthResponse>(`${environment.apiUrl}/auth/me`);
  }

  recuperarClave(peticion: RecuperarClaveRequest): Observable<MensajeRespuesta> {
    if (environment.useMockApi) {
      return of({
        mensaje:
          'Si el correo está registrado, recibirá las instrucciones de restablecimiento en unos minutos.',
      }).pipe(delay(200));
    }
    return this.http.post<MensajeRespuesta>(
      `${environment.apiUrl}/auth/recuperar-clave`,
      peticion
    );
  }

  logout(): void {
    if (environment.useMockApi || typeof localStorage === 'undefined') {
      this.limpiar();
    } else {
      this.http.post(`${environment.apiUrl}/auth/logout`, {}).subscribe({
        next: () => this.limpiar(),
        error: () => this.limpiar(),
      });
      return;
    }
    this.router.navigate(['/login']);
  }

  /** Borra la sesión local y regresa al login (lo usa el interceptor ante un 401). */
  limpiar(): void {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USUARIO_KEY);
    }
    this._usuario.set(null);
  }

  // ------------------------------------------------------------- Interno

  private loginEnMock(credenciales: LoginRequest): AuthResponse {
    const usuario = this.demo.usuarios[credenciales.username.toLowerCase()];
    if (!usuario || usuario.password !== credenciales.password) {
      throw new Error('Credenciales inválidas');
    }
    const respuesta: AuthResponse = {
      accessToken: `mock-token-${usuario.auth.id}-${Date.now()}`,
      ...usuario.auth,
    };
    this.persistir(respuesta);
    return respuesta;
  }

  private persistir(respuesta: AuthResponse): void {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(TOKEN_KEY, respuesta.accessToken);
      localStorage.setItem(USUARIO_KEY, JSON.stringify(respuesta));
    }
    this._usuario.set(respuesta);
  }

  private leerDeAlmacenamiento(): AuthResponse | null {
    if (typeof localStorage === 'undefined') {
      return null;
    }
    const token = localStorage.getItem(TOKEN_KEY);
    const crudo = localStorage.getItem(USUARIO_KEY);
    if (!token || !crudo) {
      return null;
    }
    try {
      return JSON.parse(crudo) as AuthResponse;
    } catch {
      this.limpiar();
      return null;
    }
  }
}