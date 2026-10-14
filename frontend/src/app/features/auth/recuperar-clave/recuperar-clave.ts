import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { InputComponent } from '../../../shared/components/ui-input';
import { ButtonComponent } from '../../../shared/components/ui-button';
import { AlertComponent } from '../../../shared/components/ui-alert';
import { AuthService } from '../../../core/services/auth.service';

/** Recuperación de contraseña (imagen 43). */
@Component({
  selector: 'app-recuperar-clave',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, RouterLink, InputComponent, ButtonComponent, AlertComponent],
  templateUrl: './recuperar-clave.html',
  styleUrl: './recuperar-clave.scss',
})
export class RecuperarClaveComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);

  protected readonly enviando = signal(false);
  protected readonly enviado = signal('');
  protected readonly error = signal('');

  protected readonly formulario = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
  });

  protected get emailControl() {
    return this.formulario.controls.email;
  }

  protected enviar(): void {
    if (this.formulario.invalid) {
      this.formulario.markAllAsTouched();
      return;
    }

    this.enviando.set(true);
    this.error.set('');

    this.auth.recuperarClave({ email: this.emailControl.value }).subscribe({
      next: (respuesta) => {
        this.enviando.set(false);
        this.enviado.set(respuesta.mensaje);
      },
      error: () => {
        this.enviando.set(false);
        this.error.set('No se pudo completar la solicitud. Inténtelo de nuevo.');
      },
    });
  }
}