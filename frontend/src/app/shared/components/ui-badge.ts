import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import { IconComponent } from './ui-icon';

export type VarianteBadge =
  | 'neutro'
  | 'primario'
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
  | 'contraste';

/** Etiqueta de estado: «Sanitas», «Activo», «Confirmado», «PENDIENTE»… */
@Component({
  selector: 'ui-badge',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent],
  template: `
    <span [class]="'badge badge--' + variante()" [class.badge--grande]="grande()">
      @if (icono()) {
        <ui-icon [nombre]="icono()" [tamano]="11" [grosor]="2.5" />
      }
      <ng-content />
    </span>
  `,
  styleUrl: './ui-badge.scss',
})
export class BadgeComponent {
  readonly variante = input<VarianteBadge>('neutro');
  readonly icono = input('');
  readonly grande = input(false);
}