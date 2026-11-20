import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { PuntoVolumen } from '../../core/models';

/**
 * Gráfico de barras de volumen de pacientes (imagen 44), en SVG puro.
 * La barra más alta se resalta como «Pico». Si todos los días están en cero se
 * muestra un estado vacío en lugar de un lienzo en blanco.
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

  /** `true` si no hubo atenciones en ningún día del periodo. */
  protected readonly vacio = computed(() => this.datos().every((d) => !d.total));

  protected readonly descripcion = computed(() =>
    'Pacientes por día: ' + this.datos().map((d) => `${d.etiqueta} ${d.total}`).join(', ')
  );

  /** Porcentaje de altura de cada barra respecto a la más alta (mínimo 4 % para que se vea). */
  protected readonly barras = computed(() => {
    const max = this.maximo();
    return this.datos().map((d) => ({
      ...d,
      altura: d.total ? Math.max(4, Math.round((d.total / max) * 100)) : 0,
    }));
  });
}