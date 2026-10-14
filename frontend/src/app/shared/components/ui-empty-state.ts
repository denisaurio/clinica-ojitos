import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import { IconComponent } from './ui-icon';

/** Estado vacío del prototipo (imagen 24): icono circular, mensaje y acción. */
@Component({
  selector: 'ui-empty-state',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent],
  template: `
    <div class="vacio">
      <div class="vacio__circulo">
        <ui-icon [nombre]="icono()" [tamano]="26" [grosor]="1.6" />
      </div>
      <h3 class="vacio__titulo">{{ titulo() }}</h3>
      @if (descripcion()) {
        <p class="vacio__descripcion">{{ descripcion() }}</p>
      }
      <div class="vacio__accion">
        <ng-content />
      </div>
    </div>
  `,
  styleUrl: './ui-empty-state.scss',
})
export class EmptyStateComponent {
  readonly titulo = input('');
  readonly descripcion = input('');
  readonly icono = input('search');
}