import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { Observable, defer, of, throwError } from 'rxjs';
import { delay, tap } from 'rxjs/operators';

import { environment } from '../../../environments/environment';
import { AuthResponse, LoginRequest, MensajeRespuesta, PerfilUsuario, RecuperarClaveRequest, RestablecerClaveRequest, Rol } from '../models';
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

  /**
   * @param recordar `true` guarda la sesión en localStorage (sobrevive al cerrar
   *   el navegador); `false` en sessionStorage (se borra al cerrar la pestaña).
   */
  login(credentials: LoginRequest, recordar = true): Observable<AuthResponse> {
    if (environment.useMockApi) {
      // `defer` convierte el error del mock en una notificacion del observable.
      // Sin el, `loginEnMock` lanzaria de forma sincrona antes de crearse el
      // observable, el `error` del componente no se ejecutaria nunca y el
      // boton se quedaria cargando indefinidamente.
      return defer(() => of(this.loginEnMock(credentials, recordar))).pipe(delay(350));
    }

    return this.http
      .post<AuthResponse>(`${environment.apiUrl}/auth/login`, credentials)
      .pipe(tap((respuesta) => this.persistir(respuesta, recordar)));
  }

  me(): Observable<PerfilUsuario> {
    if (environment.useMockApi) {
      const usuario = this._usuario();
      return usuario
        ? of({
            id: usuario.id,
            username: usuario.username,
            nombreCompleto: usuario.nombreCompleto,
            email: usuario.email,
            rol: usuario.rol,
            activo: true,
            ultimoAcceso: new Date().toISOString(),
          }).pipe(delay(80))
        : throwError(() => new Error('Sin sesión activa'));
    }
    // El backend devuelve el perfil, no un token nuevo (AuthDto.PerfilResponse).
    return this.http.get<PerfilUsuario>(`${environment.apiUrl}/auth/me`);
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

  /** RF6.4: fija la contraseña nueva con el token del enlace del correo. */
  restablecerClave(peticion: RestablecerClaveRequest): Observable<MensajeRespuesta> {
    if (environment.useMockApi) {
      return of({ mensaje: 'Contraseña actualizada. Ya puede iniciar sesión.' }).pipe(delay(200));
    }
    return this.http.post<MensajeRespuesta>(
      `${environment.apiUrl}/auth/restablecer-clave`,
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
    for (const almacen of almacenes()) {
      almacen.removeItem(TOKEN_KEY);
      almacen.removeItem(USUARIO_KEY);
    }
    this._usuario.set(null);
  }

  // ------------------------------------------------------------- Interno

  private loginEnMock(credenciales: LoginRequest, recordar: boolean): AuthResponse {
    const usuario = this.demo.usuarios[credenciales.username.toLowerCase()];
    if (!usuario || usuario.password !== credenciales.password) {
      throw new Error('Credenciales inválidas');
    }
    const respuesta: AuthResponse = {
      accessToken: `mock-token-${usuario.auth.id}-${Date.now()}`,
      ...usuario.auth,
    };
    this.persistir(respuesta, recordar);
    return respuesta;
  }

  private persistir(respuesta: AuthResponse, recordar = true): void {
    // Una sola copia: se borra la anterior para no mezclar sesiones.
    for (const almacen of almacenes()) {
      almacen.removeItem(TOKEN_KEY);
      almacen.removeItem(USUARIO_KEY);
    }
    const destino = recordar ? globalThis.localStorage : globalThis.sessionStorage;
    if (destino) {
      destino.setItem(TOKEN_KEY, respuesta.accessToken);
      destino.setItem(USUARIO_KEY, JSON.stringify(respuesta));
    }
    this._usuario.set(respuesta);
  }

  private leerDeAlmacenamiento(): AuthResponse | null {
    const almacen = almacenes().find((a) => a.getItem(TOKEN_KEY) && a.getItem(USUARIO_KEY));
    const crudo = almacen?.getItem(USUARIO_KEY);
    if (!crudo) {
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

/** localStorage (sesión recordada) y sessionStorage (solo esta pestaña), si existen. */
function almacenes(): Storage[] {
  return [globalThis.localStorage, globalThis.sessionStorage].filter(
    (a): a is Storage => typeof a !== 'undefined' && a !== null
  );
}
