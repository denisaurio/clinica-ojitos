import { ChangeDetectionStrategy, Component, inject, input, signal } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';

import { InputComponent } from '../../../shared/components/ui-input';
import { ButtonComponent } from '../../../shared/components/ui-button';
import { AlertComponent } from '../../../shared/components/ui-alert';
import { AuthService } from '../../../core/services/auth.service';

/** Las dos contraseñas deben coincidir. */
function coinciden(grupo: AbstractControl): ValidationErrors | null {
  const nueva = grupo.get('passwordNueva')?.value;
  const repetida = grupo.get('repetir')?.value;
  return nueva && repetida && nueva !== repetida ? { distintas: true } : null;
}

/**
 * RF6.4 — pantalla a la que lleva el enlace del correo de recuperación.
 * El token llega en la URL (?token=...) y vence a los 30 minutos.
 */
@Component({
  selector: 'app-restablecer-clave',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, InputComponent, ButtonComponent, AlertComponent],
  templateUrl: './restablecer-clave.html',
  styleUrl: '../recuperar-clave/recuperar-clave.scss',
})
export class RestablecerClaveComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);

  /** Viene del query param ?token= (withComponentInputBinding). */
  readonly token = input<string>('');

  protected readonly enviando = signal(false);
  protected readonly listo = signal(false);
  protected readonly error = signal('');

  protected readonly formulario = this.fb.nonNullable.group(
    {
      passwordNueva: ['', [Validators.required, Validators.minLength(8), Validators.maxLength(100)]],
      repetir: ['', [Validators.required]],
    },
    { validators: coinciden }
  );

  protected get nueva() {
    return this.formulario.controls.passwordNueva;
  }

  protected get repetir() {
    return this.formulario.controls.repetir;
  }

  protected guardar(): void {
    if (this.formulario.invalid) {
      this.formulario.markAllAsTouched();
      return;
    }
    this.enviando.set(true);
    this.error.set('');

    this.auth
      .restablecerClave({ token: this.token() ?? '', passwordNueva: this.nueva.value })
      .subscribe({
        next: () => {
          this.enviando.set(false);
          this.listo.set(true);
        },
        error: (e: HttpErrorResponse) => {
          this.enviando.set(false);
          this.error.set(
            e.error?.message ?? e.error?.mensaje ??
              'El enlace no es válido o ya venció. Solicite uno nuevo.'
          );
        },
      });
  }
}
