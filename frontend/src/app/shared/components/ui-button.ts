import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';

import { IconComponent } from './ui-icon';

export type VarianteBoton = 'primario' | 'contorno' | 'suave' | 'peligro' | 'fantasma' | 'enlace';

/**
 * Botón del design system. Radio de 6px, tipografía Inter 13px y colores
 * exclusivamente del juego de tokens.
 *
 * Con `enlace` se renderiza un `<a>` en lugar de un `<button>`, para no anidar
 * contenido interactivo dentro de un enlace al usar `routerLink`.
 */
@Component({
  selector: 'ui-button',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent, NgTemplateOutlet],
  template: `
    @if (enlace()) {
      <a
        [class]="clases()"
        [attr.href]="destino()"
        [attr.aria-disabled]="deshabilitado() ? 'true' : null"
      >
        <ng-container *ngTemplateOutlet="contenido" />
      </a>
    } @else {
      <button
        [type]="tipo()"
        [class]="clases()"
        [disabled]="deshabilitado()"
        [attr.aria-disabled]="deshabilitado()"
      >
        <ng-container *ngTemplateOutlet="contenido" />
      </button>
    }

    <ng-template #contenido>
      @if (icono()) {
        <ui-icon [nombre]="icono()" [tamano]="iconoTamano" />
      }
      <span class="btn__texto">
        <ng-content />
      </span>
    </ng-template>
  `,
  styleUrl: './ui-button.scss',
})
export class ButtonComponent {
  readonly variante = input<VarianteBoton>('primario');
  readonly tamano = input<'sm' | 'md'>('md');
  readonly tipo = input<'button' | 'submit' | 'reset'>('button');
  readonly icono = input('');
  readonly deshabilitado = input(false);

  /** Renderiza un `<a>`; usa `destino` como `href`. */
  readonly enlace = input(false);

  readonly destino = input('/');

  protected readonly iconoTamano = 16;

  protected readonly clases = () => `btn btn--${this.variante()} btn--${this.tamano()}`;
}