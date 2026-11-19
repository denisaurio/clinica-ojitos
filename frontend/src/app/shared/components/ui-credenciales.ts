import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

import { ModalComponent } from './ui-modal';
import { AlertComponent } from './ui-alert';
import { ButtonComponent } from './ui-button';
import { Credenciales } from '../../core/models';

/**
 * Muestra una credencial de acceso recién emitida (RF-06): usuario, contraseña
 * y descarga en .txt. La contraseña solo existe en esta respuesta: en la base
 * queda su hash BCrypt y no se puede volver a consultar.
 */
@Component({
  selector: 'ui-credenciales',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ModalComponent, AlertComponent, ButtonComponent],
  template: `
    <ui-modal [abierto]="true" [titulo]="titulo() || 'Credenciales de ' + credenciales().nombreCompleto" (cerrar)="cerrar.emit()">
      <div class="credenciales">
        <ui-alert tipo="warning">
          <strong>Esta contraseña se muestra una sola vez.</strong>
          Descárguela y entréguela al profesional: después el sistema solo guarda su cifrado.
        </ui-alert>

        <dl class="credenciales__datos">
          <dt>Usuario</dt>
          <dd><code>{{ credenciales().username }}</code></dd>
          <dt>Contraseña</dt>
          <dd><code class="credenciales__clave">{{ credenciales().password }}</code></dd>
        </dl>

        <p class="credenciales__ayuda">
          Con estos datos entra en la pantalla de inicio de sesión y puede cambiar la
          contraseña en <strong>Configuración → Mi cuenta</strong>.
        </p>
      </div>

      <ng-container slot="pie">
        <ui-button variante="contorno" tipo="button" (click)="cerrar.emit()">Cerrar</ui-button>
        <ui-button variante="primario" tipo="button" icono="download" (click)="descargar()">
          Descargar credenciales
        </ui-button>
      </ng-container>
    </ui-modal>
  `,
  styles: `
    .credenciales {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .credenciales__datos {
      display: grid;
      grid-template-columns: auto 1fr;
      gap: 10px 16px;
      margin: 0;
      font-size: 14px;
    }
    .credenciales__datos dt {
      font-weight: 600;
    }
    .credenciales__datos dd {
      margin: 0;
    }
    .credenciales__clave {
      font-size: 16px;
      font-weight: 700;
      letter-spacing: 0.04em;
    }
    .credenciales__ayuda {
      margin: 0;
      font-size: 13px;
      opacity: 0.8;
    }
  `,
})
export class CredencialesComponent {
  readonly credenciales = input.required<Credenciales>();
  readonly titulo = input('');
  readonly cerrar = output<void>();

  /** Descarga la credencial como .txt para entregarla impresa. */
  protected descargar(): void {
    const c = this.credenciales();
    const contenido =
      c.textoParaDescargar ||
      `Clínica Ojitos — credenciales de acceso\n\nUsuario: ${c.username}\nContraseña: ${c.password}\n`;
    const url = URL.createObjectURL(new Blob([contenido], { type: 'text/plain;charset=utf-8' }));
    const enlace = document.createElement('a');
    enlace.href = url;
    enlace.download = `credenciales-${c.username}.txt`;
    enlace.click();
    URL.revokeObjectURL(url);
  }
}
