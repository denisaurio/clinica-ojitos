import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';

import { CardComponent } from '../../shared/components/ui-card';
import { ButtonComponent } from '../../shared/components/ui-button';
import { InputComponent } from '../../shared/components/ui-input';
import { AlertComponent } from '../../shared/components/ui-alert';
import { AuthService } from '../../core/services/auth.service';

/**
 * Configuración → Mi cuenta: datos del propio usuario y cambio de su
 * contraseña (PATCH /auth/cambiar-clave, exige la actual).
 */
@Component({
  selector: 'app-configuracion',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, CardComponent, ButtonComponent, InputComponent, AlertComponent],
  template: `
    <div class="page">
      <h1 class="page-title">Configuración</h1>
      <p class="page-subtitle">Preferencias de su cuenta en el portal clínico.</p>

      <div class="configuracion__rejilla">
        <ui-card titulo="Perfil de usuario" icono="user">
          <dl class="datos">
            <div class="datos__fila">
              <dt>Nombre</dt>
              <dd>{{ nombre() }}</dd>
            </div>
            <div class="datos__fila">
              <dt>Usuario</dt>
              <dd>{{ usuario()?.username }}</dd>
            </div>
            <div class="datos__fila">
              <dt>Correo</dt>
              <dd>{{ usuario()?.email }}</dd>
            </div>
            <div class="datos__fila">
              <dt>Rol</dt>
              <dd>{{ usuario()?.rol }}</dd>
            </div>
          </dl>
        </ui-card>

        <ui-card titulo="Mi cuenta · Cambiar contraseña" icono="lock">
          <form [formGroup]="formulario" (ngSubmit)="cambiar()" novalidate class="clave">
            @if (aviso(); as a) {
              <ui-alert [tipo]="a.tipo">{{ a.texto }}</ui-alert>
            }

            <ui-input
              formControlName="actual"
              etiqueta="Contraseña actual"
              tipo="password"
              icono="lock"
              autocompletar="current-password"
              [requerido]="true"
              [error]="c.actual.invalid && c.actual.touched ? 'Escriba su contraseña actual.' : ''"
            />
            <ui-input
              formControlName="nueva"
              etiqueta="Nueva contraseña"
              tipo="password"
              icono="lock"
              autocompletar="new-password"
              [requerido]="true"
              [error]="c.nueva.invalid && c.nueva.touched ? 'Mínimo 8 caracteres.' : ''"
            />
            <ui-input
              formControlName="repetir"
              etiqueta="Repita la nueva contraseña"
              tipo="password"
              icono="lock"
              autocompletar="new-password"
              [requerido]="true"
              [error]="c.repetir.touched && distintas() ? 'Las contraseñas no coinciden.' : ''"
            />

            <div class="clave__acciones">
              <ui-button variante="primario" tipo="submit" icono="save" [deshabilitado]="guardando()">
                {{ guardando() ? 'Guardando…' : 'Cambiar contraseña' }}
              </ui-button>
              <ui-button variante="fantasma" tipo="button" (click)="irARecuperacion()">
                ¿Olvidó la actual?
              </ui-button>
            </div>
          </form>
        </ui-card>
      </div>
    </div>
  `,
  styleUrl: './configuracion.scss',
})
export class ConfiguracionComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);

  protected readonly usuario = this.auth.usuario;
  protected readonly nombre = this.auth.nombreCompleto;

  protected readonly guardando = signal(false);
  protected readonly aviso = signal<{ tipo: 'success' | 'danger'; texto: string } | null>(null);

  protected readonly formulario = this.fb.nonNullable.group({
    actual: ['', [Validators.required]],
    nueva: ['', [Validators.required, Validators.minLength(8), Validators.maxLength(100)]],
    repetir: ['', [Validators.required]],
  });

  protected get c() {
    return this.formulario.controls;
  }

  protected distintas(): boolean {
    return !this.c.repetir.value || this.c.nueva.value !== this.c.repetir.value;
  }

  protected cambiar(): void {
    if (this.formulario.invalid || this.distintas()) {
      this.formulario.markAllAsTouched();
      return;
    }
    this.guardando.set(true);
    this.aviso.set(null);
    this.auth.cambiarClave(this.c.actual.value, this.c.nueva.value).subscribe({
      next: () => {
        this.guardando.set(false);
        this.formulario.reset();
        this.aviso.set({ tipo: 'success', texto: 'Contraseña actualizada. Úsela la próxima vez que entre.' });
      },
      error: (fallo) => {
        this.guardando.set(false);
        this.aviso.set({
          tipo: 'danger',
          texto: fallo?.error?.message || 'No se pudo cambiar la contraseña.',
        });
      },
    });
  }

  protected irARecuperacion(): void {
    this.router.navigate(['/recuperar-clave']);
  }
}
