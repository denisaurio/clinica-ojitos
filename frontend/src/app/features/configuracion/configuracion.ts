import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router } from '@angular/router';

import { CardComponent } from '../../shared/components/ui-card';
import { ButtonComponent } from '../../shared/components/ui-button';
import { AuthService } from '../../core/services/auth.service';
import { IconComponent } from '../../shared/components/ui-icon';

/**
 * Preferencias de la cuenta. Solo muestra datos del propio usuario: el backend
 * es quien aplica cualquier cambio de permisos.
 */
@Component({
  selector: 'app-configuracion',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CardComponent, IconComponent, ButtonComponent],
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

        <ui-card titulo="Seguridad" icono="shield">
          <p class="configuracion__texto">
            Su contraseña se almacena cifrada con BCrypt y nunca viaja en el
            historial clínico que transporta el token. Para cambiar la contraseña
            utilice la recuperación desde la pantalla de acceso.
          </p>
          <ui-button variante="contorno" icono="lock" (click)="irARecuperacion()">
            Recuperar contraseña
          </ui-button>
        </ui-card>
      </div>
    </div>
  `,
  styleUrl: './configuracion.scss',
})
export class ConfiguracionComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly usuario = this.auth.usuario;
  protected readonly nombre = this.auth.nombreCompleto;

  protected irARecuperacion(): void {
    this.router.navigate(['/recuperar-clave']);
  }
}
