import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import { IconComponent } from './ui-icon';

/**
 * Superficie base del prototipo: fondo blanco, borde `$border`, radio de 10px y
 * una sombra apenas perceptible.
 */
@Component({
  selector: 'ui-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent],
  template: `
    <section class="card" [class.card--plano]="plano()">
      @if (titulo() || subtitulo()) {
        <header class="card__cabecera">
          <div class="card__titulos">
            @if (icono()) {
              <ui-icon class="card__icono" [nombre]="icono()" [tamano]="17" />
            }
            @if (titulo()) {
              <h2 class="card__titulo">{{ titulo() }}</h2>
            }
            @if (subtitulo()) {
              <p class="card__subtitulo">{{ subtitulo() }}</p>
            }
          </div>
          <div class="card__accion">
            <ng-content select="[slot=accion]" />
          </div>
        </header>
      }
      <div class="card__cuerpo" [class.card__cuerpo--sin]="sinPadding()">
        <ng-content />
      </div>
    </section>
  `,
  styleUrl: './ui-card.scss',
})
export class CardComponent {
  readonly titulo = input('');
  readonly subtitulo = input('');
  readonly icono = input('');
  /** Sin borde ni sombra: útil dentro de otras tarjetas. */
  readonly plano = input(false);
  /** El contenido gestiona sus propios márgenes (tablas, listas). */
  readonly sinPadding = input(false);
}