import { ChangeDetectionStrategy, Component, input, model, output } from '@angular/core';

import { IconComponent } from './ui-icon';

export type TamanoModal = 'sm' | 'md' | 'lg';

/**
 * Diálogo modal del prototipo (imágenes 31, 33 y 37): velo oscuro, panel
 * centrado con título, icono de cierre y pie de acciones opcional.
 */
@Component({
  selector: 'ui-modal',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent],
  template: `
    @if (abierto()) {
      <div class="velo" (click)="cerrar.emit()">
        <div
          [class]="'modal modal--' + tamano() + ' modal--' + variante()"
          role="dialog"
          aria-modal="true"
          [attr.aria-label]="titulo()"
          (click)="$event.stopPropagation()"
        >
          @if (titulo()) {
            <header class="modal__cabecera">
              @if (icono()) {
                <ui-icon class="modal__icono" [nombre]="icono()" [tamano]="18" />
              }
              <h2 class="modal__titulo">{{ titulo() }}</h2>
              <button type="button" class="modal__cerrar" aria-label="Cerrar" (click)="cerrar.emit()">
                <ui-icon nombre="x" [tamano]="18" />
              </button>
            </header>
          }
          <div class="modal__cuerpo">
            <ng-content />
          </div>
          <footer class="modal__pie">
            <ng-content select="[slot=pie]" />
          </footer>
        </div>
      </div>
    }
  `,
  styleUrl: './ui-modal.scss',
})
export class ModalComponent {
  readonly abierto = model(false);
  readonly titulo = input('');
  readonly icono = input('');
  readonly tamano = input<TamanoModal>('md');
  /** `peligro` añade el borde superior rojo de las confirmaciones destructivas. */
  readonly variante = input<'neutro' | 'peligro'>('neutro');

  readonly cerrar = output<void>();
}