import { ChangeDetectionStrategy, Component, input, output, signal } from '@angular/core';

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
          Cópiela o descárguela y entréguela a su titular: después el sistema solo guarda su cifrado.
        </ui-alert>

        <dl class="credenciales__datos">
          <dt>Usuario</dt>
          <dd class="credenciales__valor">
            <code>{{ credenciales().username }}</code>
            <button type="button" class="credenciales__copiar" (click)="copiar('usuario', credenciales().username)">
              {{ copiado() === 'usuario' ? '¡Copiado!' : 'Copiar' }}
            </button>
          </dd>
          <dt>Contraseña</dt>
          <dd class="credenciales__valor">
            <code class="credenciales__clave">{{ credenciales().password }}</code>
            <button type="button" class="credenciales__copiar" (click)="copiar('clave', credenciales().password)">
              {{ copiado() === 'clave' ? '¡Copiado!' : 'Copiar' }}
            </button>
          </dd>
        </dl>

        <p class="credenciales__ayuda">
          Use <strong>Copiar</strong> para no confundir letras parecidas (l, I, 1).
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
    .credenciales__valor {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 10px;
    }
    .credenciales__valor code {
      font-family: 'Consolas', 'Courier New', monospace;
      word-break: break-all;
    }
    .credenciales__copiar {
      padding: 3px 10px;
      border: 1px solid #cbd5e1;
      border-radius: 999px;
      background: #fff;
      font: inherit;
      font-size: 12px;
      font-weight: 600;
      color: #1b3a5f;
      cursor: pointer;
    }
    .credenciales__copiar:hover {
      background: #f1f5f9;
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

  protected readonly copiado = signal<'usuario' | 'clave' | null>(null);

  /** Copia al portapapeles: evita transcribir a mano letras que se confunden. */
  protected copiar(que: 'usuario' | 'clave', texto: string): void {
    const listo = () => {
      this.copiado.set(que);
      setTimeout(() => this.copiado.set(null), 1800);
    };
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(texto).then(listo, () => this.copiarConSeleccion(texto, listo));
    } else {
      this.copiarConSeleccion(texto, listo);
    }
  }

  /** Alternativa para http sin HTTPS, donde navigator.clipboard no existe. */
  private copiarConSeleccion(texto: string, listo: () => void): void {
    const area = document.createElement('textarea');
    area.value = texto;
    area.style.position = 'fixed';
    area.style.opacity = '0';
    document.body.appendChild(area);
    area.select();
    try {
      if (document.execCommand('copy')) listo();
    } finally {
      area.remove();
    }
  }

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
