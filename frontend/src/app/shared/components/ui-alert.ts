import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import { IconComponent } from './ui-icon';

export type TipoAlert = 'danger' | 'success' | 'warning' | 'info';

const ICONO_POR_TIPO: Record<TipoAlert, string> = {
  danger: 'alertCircle',
  success: 'checkCircle',
  warning: 'alertTriangle',
  info: 'info',
};

/** Aviso destacado: errores de validación (imagen 25), confirmaciones, avisos. */
@Component({
  selector: 'ui-alert',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent],
  template: `
    <div [class]="'alert alert--' + tipo()" role="alert">
      <ui-icon class="alert__icono" [nombre]="iconoVisible()" [tamano]="16" />
      <div class="alert__contenido">
        @if (titulo()) {
          <p class="alert__titulo">{{ titulo() }}</p>
        }
        <div class="alert__texto">
          <ng-content />
        </div>
        <ng-content select="[slot=extra]" />
      </div>
    </div>
  `,
  styleUrl: './ui-alert.scss',
})
export class AlertComponent {
  readonly tipo = input<TipoAlert>('info');
  readonly titulo = input('');
  readonly icono = input<string>('');

  protected iconoPorTipo = ICONO_POR_TIPO;

  protected readonly iconoVisible = () => this.icono() || this.iconoPorTipo[this.tipo()];
}