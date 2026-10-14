import { ChangeDetectionStrategy, Component, input } from '@angular/core';

export interface PasoStepper {
  etiqueta: string;
  /** Estado del paso: el activo va en azul, los previos con marca de completados. */
  activo?: boolean;
  completado?: boolean;
}

/**
 * Indicador de progreso horizontal (imágenes 25 y 32).
 * El paso activo muestra un círculo azul con su número; el resto, gris claro.
 */
@Component({
  selector: 'ui-stepper',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ol class="stepper">
      @for (paso of pasos(); track paso.etiqueta; let i = $index; let ultimo = $last) {
        <li
          class="stepper__paso"
          [class.stepper__paso--activo]="paso.activo"
          [class.stepper__paso--hecho]="paso.completado"
        >
          <div class="stepper__linea">
            <span class="stepper__circulo">{{ i + 1 }}</span>
            @if (!ultimo) {
              <span class="stepper__trazo"></span>
            }
          </div>
          <span class="stepper__etiqueta">{{ paso.etiqueta }}</span>
        </li>
      }
    </ol>
  `,
  styleUrl: './ui-stepper.scss',
})
export class StepperComponent {
  readonly pasos = input.required<PasoStepper[]>();
}