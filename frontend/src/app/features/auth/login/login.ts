import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';

import { IconComponent } from '../../../shared/components/ui-icon';
import { InputComponent } from '../../../shared/components/ui-input';
import { ButtonComponent } from '../../../shared/components/ui-button';
import { AuthService } from '../../../core/services/auth.service';
import { panelDe } from '../../../core/guards/role.guard';

/** RF6.2 — máximo tres intentos fallidos antes del bloqueo temporal. */
const MAX_INTENTOS = 3;

/**
 * Pantalla de acceso (imagen 42). Muestra el contador de intentos y el mensaje
 * de error tal y como los devuelve el backend, sin inventar mensajes propios.
 */
@Component({
  selector: 'app-login',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, RouterLink, IconComponent, InputComponent, ButtonComponent],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class LoginComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly maxIntentos = MAX_INTENTOS;

  protected readonly submitting = signal(false);
  protected readonly error = signal('');
  protected readonly intentos = signal(0);
  protected readonly bloqueado = signal(false);

  /** `true` cuando el fallo fue de conexión, no de credenciales. */
  protected readonly servidorCaido = signal(false);

  protected passwordVisible = false;

  protected readonly formulario = this.fb.nonNullable.group({
    username: ['', [Validators.required]],
    password: ['', [Validators.required, Validators.minLength(4)]],
  });

  protected get usuarioControl() {
    return this.formulario.controls.username;
  }

  protected get passwordControl() {
    return this.formulario.controls.password;
  }

  /** RF6.2 — el progreso se llena a medida que se agotan los intentos. */
  protected readonly progresoIntentos = () =>
    Math.min(100, Math.round((this.intentos() / MAX_INTENTOS) * 100));

  protected alternarVisibilidad(): void {
    this.passwordVisible = !this.passwordVisible;
  }

  protected entrar(): void {
    if (this.bloqueado()) {
      return;
    }

    if (this.formulario.invalid) {
      this.formulario.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    this.error.set('');

    this.auth.login(this.formulario.getRawValue()).subscribe({
      next: (respuesta) => {
        this.submitting.set(false);
        this.router.navigateByUrl(panelDe(respuesta.rol));
      },
      error: (fallo: unknown) => {
        this.submitting.set(false);

        // Un 401 es una credencial rechazada: cuenta como intento (RF6.2).
        // Cualquier otro fallo —backend apagado, proxy caido, timeout— no es un
        // intento de acceso, así que no debe gastar un intento nigrow.
        if (!esCredencialRechazada(fallo)) {
          this.servidorCaido.set(true);
          this.error.set(
            'No se pudo conectar con el servidor. Revisa que el backend esté corriendo en el puerto 8080.'
          );
          return;
        }

        this.servidorCaido.set(false);
        const intentos = this.intentos() + 1;
        this.intentos.set(intentos);
        this.error.set(
          'El nombre de usuario o la contraseña son incorrectos. Por favor, intente de nuevo.'
        );
        if (intentos >= MAX_INTENTOS) {
          this.bloqueado.set(true);
        }
        this.passwordControl.setValue('');
        this.passwordControl.markAsTouched();
      },
    });
  }
}

/**
 * `true` solo cuando el servidor respondió y rechazó las credenciales (401).
 * Un error de red llega con `status === 0` desde el navegador, y el proxy de
 * Angular devuelve 502/503/504 cuando no alcanza al backend: ninguno de esos
 * casos debe contar como un intento fallido de RF6.2.
 */
function esCredencialRechazada(fallo: unknown): boolean {
  if (fallo instanceof HttpErrorResponse) {
    return fallo.status === 401;
  }
  return fallo instanceof Error && fallo.message.includes('401');
}