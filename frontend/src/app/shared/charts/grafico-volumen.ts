import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { PuntoVolumen } from '../../core/models';

/**
 * Gráfico de barras de volumen de pacientes (imagen 44), en SVG puro.
 * La barra más alta se resalta y se etiqueta como «Peak», igual que el prototipo.
 */
@Component({
  selector: 'app-grafico-volumen',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './grafico-volumen.html',
  styleUrl: './grafico-volumen.scss',
})
export class GraficoVolumenComponent {
  readonly datos = input.required<PuntoVolumen[]>();

  protected readonly maximo = computed(() =>
    Math.max(...this.datos().map((d) => d.total), 1)
  );

  /** Porcentaje de altura de cada barra respecto a la más alta. */
  protected readonly barras = computed(() => {
    const max = this.maximo();
    return this.datos().map((d) => ({
      ...d,
      altura: Math.round((d.total / max) * 100),
    }));
  });
}