import { ChangeDetectionStrategy, Component, inject, input, output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { ModalComponent } from '../../shared/components/ui-modal';
import { InputComponent } from '../../shared/components/ui-input';
import { ButtonComponent } from '../../shared/components/ui-button';
import { AlertComponent } from '../../shared/components/ui-alert';
import { OftalmologoService } from '../../core/services/oftalmologo.service';
import { Credenciales } from '../../core/models';

/**
 * El administrador fija la contraseña de un médico (la escribe él o pide una
 * al azar). Se abre desde los tres puntos del directorio y desde el perfil.
 * Al terminar emite las credenciales para mostrarlas con `<ui-credenciales>`.
 */
@Component({
  selector: 'app-cambiar-clave-medico',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, ModalComponent, InputComponent, ButtonComponent, AlertComponent],
  template: `
    <ui-modal [abierto]="true" icono="lock" [titulo]="'Cambiar contraseña de ' + nombre()" (cerrar)="cerrar.emit()">
      <form [formGroup]="formulario" (ngSubmit)="guardar()" novalidate class="clave">
        <p class="clave__texto">
          Escriba la contraseña con la que entrará el médico. La anterior deja de
          servir. Él podrá cambiarla luego en <strong>Configuración → Mi cuenta</strong>.
        </p>

        @if (error()) {
          <ui-alert tipo="danger">{{ error() }}</ui-alert>
        }

        <ui-input
          formControlName="password"
          etiqueta="Nueva contraseña"
          tipo="password"
          icono="lock"
          [requerido]="true"
          [error]="c.password.invalid && c.password.touched ? 'Mínimo 8 caracteres.' : ''"
        />
        <ui-input
          formControlName="repetir"
          etiqueta="Repita la contraseña"
          tipo="password"
          icono="lock"
          [requerido]="true"
          [error]="c.repetir.touched && distintas() ? 'Las contraseñas no coinciden.' : ''"
        />
        <button type="submit" hidden></button>
      </form>

      <ng-container slot="pie">
        <ui-button variante="fantasma" tipo="button" [deshabilitado]="enviando()" (click)="enviar(null)">
          Generar una al azar
        </ui-button>
        <ui-button variante="contorno" tipo="button" (click)="cerrar.emit()">Cancelar</ui-button>
        <ui-button variante="primario" tipo="button" icono="save" [deshabilitado]="enviando()" (click)="guardar()">
          {{ enviando() ? 'Guardando…' : 'Guardar contraseña' }}
        </ui-button>
      </ng-container>
    </ui-modal>
  `,
  styles: `
    .clave { display: flex; flex-direction: column; gap: 14px; }
    .clave__texto { margin: 0; color: #64748b; font-size: 0.9rem; line-height: 1.5; }
  `,
})
export class CambiarClaveMedicoComponent {
  private readonly fb = inject(FormBuilder);
  private readonly oftalmologos = inject(OftalmologoService);

  readonly medicoId = input.required<number>();
  readonly nombre = input('');
  readonly cerrar = output<void>();
  readonly listo = output<Credenciales>();

  protected readonly enviando = signal(false);
  protected readonly error = signal('');

  protected readonly formulario = this.fb.nonNullable.group({
    password: ['', [Validators.required, Validators.minLength(8), Validators.maxLength(100)]],
    repetir: ['', [Validators.required]],
  });

  protected get c() {
    return this.formulario.controls;
  }

  protected distintas(): boolean {
    return !this.c.repetir.value || this.c.password.value !== this.c.repetir.value;
  }

  protected guardar(): void {
    if (this.formulario.invalid || this.distintas()) {
      this.formulario.markAllAsTouched();
      return;
    }
    this.enviar(this.c.password.value);
  }

  /** `null` = que el sistema genere una contraseña aleatoria. */
  protected enviar(password: string | null): void {
    this.enviando.set(true);
    this.error.set('');
    this.oftalmologos.credenciales(this.medicoId(), password ?? undefined).subscribe({
      next: (cred) => {
        this.enviando.set(false);
        this.listo.emit(cred);
      },
      error: (fallo) => {
        this.enviando.set(false);
        this.error.set(fallo?.error?.message || 'No se pudo cambiar la contraseña.');
      },
    });
  }
}
