import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { ICONOS } from '../icons/iconos';

/**
 * Icono SVG en línea con trazo `currentColor`.
 *
 * Sustituye a cualquier librería de iconos: todos los glyphs del prototipo
 * salen de `ICONOS` y heredan el color del contenedor.
 */
@Component({
  selector: 'ui-icon',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <svg
      xmlns="http://www.w3.org/2000/svg"
      class="icono"
      [attr.width]="tamano()"
      [attr.height]="tamano()"
      [attr.viewBox]="viewBox"
      fill="none"
      stroke="currentColor"
      [attr.stroke-width]="grosor()"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      @for (d of trazos(); track $index) {
        <path [attr.d]="d" />
      }
    </svg>
  `,
  styles: `
    :host {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      line-height: 0;
    }

    .icono {
      display: block;
      flex-shrink: 0;
    }
  `,
})
export class IconComponent {
  /** Nombre registrado en `ICONOS`. Un nombre desconocido dibuja un punto. */
  readonly nombre = input.required<string>();

  readonly tamano = input<number>(16);

  readonly grosor = input<number>(2);

  readonly viewBox = '0 0 24 24';

  protected readonly trazos = computed<string[]>(() => ICONOS[this.nombre()] ?? ['M12 12h.01']);
}