import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import { IconComponent } from './ui-icon';

export type TonoStat = 'azul' | 'verde' | 'violeta' | 'ambar' | 'rojo' | 'gris';

/**
 * Tarjeta de métrica de los paneles: franja de color, icono, valor grande y
 * etiqueta. Cada tono sale de los tokens de `styles/_variables.scss`.
 */
@Component({
  selector: 'ui-stat',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent],
  template: `
    <article class="stat" [class]="'stat stat--' + tono()">
      <div class="stat__cabeza">
        <span class="stat__icono"><ui-icon [nombre]="icono()" [tamano]="22" /></span>
        @if (chip()) {
          <span class="stat__chip">{{ chip() }}</span>
        }
      </div>
      <p class="stat__valor">{{ valor() }}</p>
      <p class="stat__etiqueta">{{ etiqueta() }}</p>
      @if (detalle()) {
        <p class="stat__detalle">{{ detalle() }}</p>
      }
    </article>
  `,
  styleUrl: './ui-stat.scss',
})
export class StatComponent {
  readonly valor = input.required<string | number>();
  readonly etiqueta = input.required<string>();
  readonly icono = input('activity');
  readonly tono = input<TonoStat>('azul');
  readonly chip = input('');
  readonly detalle = input('');
}
