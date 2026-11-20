import { ChangeDetectionStrategy, Component, ElementRef, inject, signal, viewChild } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';

import { IconComponent } from '../../../shared/components/ui-icon';
import { AuthService } from '../../../core/services/auth.service';
import { panelDe } from '../../../core/guards/role.guard';

/** RF6.2 — máximo tres intentos fallidos antes del bloqueo temporal. */
const MAX_INTENTOS = 3;

/** Debe coincidir con `@Size(min = 6)` de AuthDto.LoginRequest en el backend. */
const MIN_CLAVE = 6;

/**
 * Cuentas de demostración de `sql/02_datos_prueba.sql` y `sql/04_cuentas_iniciales.sql`.
 * Son públicas (README) y solo existen si se cargaron los datos demo.
 */
const CUENTAS_DEMO = [
  { etiqueta: 'Administrador', usuario: 'admin', clave: 'admin123' },
  { etiqueta: 'Recepción', usuario: 'recepcion', clave: 'Ojitos2026*' },
  { etiqueta: 'Paciente', usuario: 'paciente', clave: 'Ojitos2026*' },
] as const;

type TipoFallo = 'credenciales' | 'bloqueo' | 'validacion' | 'red' | 'servidor';

interface Fallo {
  tipo: TipoFallo;
  titulo: string;
  mensaje: string;
}

/**
 * Pantalla de acceso (RF-06): panel de marca a la izquierda y formulario a la
 * derecha. Distingue una credencial rechazada de un fallo de red o del
 * servidor, y muestra el mensaje que devuelve el backend.
 */
@Component({
  selector: 'app-login',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, RouterLink, IconComponent],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class LoginComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  private readonly campoClave = viewChild<ElementRef<HTMLInputElement>>('campoClave');

  protected readonly maxIntentos = MAX_INTENTOS;
  protected readonly minClave = MIN_CLAVE;
  protected readonly cuentasDemo = CUENTAS_DEMO;

  protected readonly enviando = signal(false);
  protected readonly fallo = signal<Fallo | null>(null);
  protected readonly intentos = signal(0);
  protected readonly bloqueado = signal(false);
  protected readonly claveVisible = signal(false);

  protected readonly formulario = this.fb.nonNullable.group({
    username: ['', [Validators.required]],
    password: ['', [Validators.required, Validators.minLength(MIN_CLAVE)]],
    recordar: [false],
  });

  protected get usuario() {
    return this.formulario.controls.username;
  }

  protected get clave() {
    return this.formulario.controls.password;
  }

  protected errorUsuario(): string {
    return this.usuario.invalid && this.usuario.touched ? 'Ingresa tu usuario.' : '';
  }

  protected errorClave(): string {
    if (!this.clave.touched || this.clave.valid) return '';
    return this.clave.hasError('minlength')
      ? `La contraseña tiene al menos ${MIN_CLAVE} caracteres.`
      : 'Ingresa tu contraseña.';
  }

  /** RF6.2 — la barra se llena a medida que se agotan los intentos. */
  protected progresoIntentos(): number {
    return Math.min(100, Math.round((this.intentos() / MAX_INTENTOS) * 100));
  }

  protected alternarClave(): void {
    this.claveVisible.update((v) => !v);
  }

  /** Rellena una cuenta demo; el usuario confirma con «Iniciar Sesión». */
  protected usarDemo(cuenta: (typeof CUENTAS_DEMO)[number]): void {
    this.formulario.patchValue({ username: cuenta.usuario, password: cuenta.clave });
    this.fallo.set(null);
    this.campoClave()?.nativeElement.focus();
  }

  protected entrar(): void {
    if (this.bloqueado() || this.enviando()) return;

    if (this.formulario.invalid) {
      this.formulario.markAllAsTouched();
      return;
    }

    const { username, password, recordar } = this.formulario.getRawValue();
    this.enviando.set(true);
    this.fallo.set(null);

    this.auth.login({ username: username.trim(), password }, recordar).subscribe({
      next: (respuesta) => {
        this.enviando.set(false);
        this.router.navigateByUrl(panelDe(respuesta.rol));
      },
      error: (error: unknown) => {
        this.enviando.set(false);
        const fallo = clasificar(error);
        this.fallo.set(fallo);

        // Solo una credencial rechazada cuenta como intento (RF6.2): un corte de
        // red o un error del servidor no son intentos de acceso.
        if (fallo.tipo === 'credenciales') {
          const intentos = this.intentos() + 1;
          this.intentos.set(intentos);
          if (intentos >= MAX_INTENTOS) this.bloqueado.set(true);
        }
        if (fallo.tipo === 'bloqueo') {
          this.intentos.set(MAX_INTENTOS);
          this.bloqueado.set(true);
        }
        if (fallo.tipo === 'credenciales' || fallo.tipo === 'bloqueo') {
          this.clave.setValue('');
          this.clave.markAsUntouched();
          this.campoClave()?.nativeElement.focus();
        }
      },
    });
  }
}

/** Traduce el error HTTP a un mensaje que el usuario puede entender. */
export function clasificar(error: unknown): Fallo {
  if (error instanceof HttpErrorResponse) {
    const mensajeBackend =
      typeof error.error === 'object' && error.error !== null && 'message' in error.error
        ? String((error.error as { message: unknown }).message ?? '')
        : '';

    if (error.status === 0) {
      return {
        tipo: 'red',
        titulo: 'Sin conexión con el servidor',
        mensaje:
          'No pudimos contactar con el servidor. Revisa tu conexión a internet e inténtalo en unos minutos.',
      };
    }
    if (error.status === 401) {
      const bloqueo = /bloquead|inactiva/i.test(mensajeBackend);
      return {
        tipo: bloqueo ? 'bloqueo' : 'credenciales',
        titulo: bloqueo ? 'Cuenta bloqueada' : 'Credenciales incorrectas',
        mensaje: mensajeBackend || 'El usuario o la contraseña son incorrectos.',
      };
    }
    if (error.status === 400 || error.status === 422) {
      return {
        tipo: 'validacion',
        titulo: 'Revisa los datos',
        mensaje: mensajeBackend || 'Los datos enviados no son válidos.',
      };
    }
    if (error.status === 403) {
      return {
        tipo: 'servidor',
        titulo: 'Acceso no permitido desde esta dirección',
        mensaje:
          'El servidor rechazó la solicitud de esta página. Avisa al administrador para que revise la configuración (CORS).',
      };
    }
    return {
      tipo: 'servidor',
      titulo: 'El servidor tuvo un problema',
      mensaje: 'No se pudo completar el inicio de sesión. Inténtalo de nuevo en unos minutos.',
    };
  }

  // Modo demostración: el mock lanza Error('Credenciales inválidas').
  return {
    tipo: 'credenciales',
    titulo: 'Credenciales incorrectas',
    mensaje: 'El usuario o la contraseña son incorrectos.',
  };
}
