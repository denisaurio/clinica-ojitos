import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { PuntoEvolucion } from '../../core/models';

interface SerieGrafica {
  clave: 'pioOd' | 'pioOi';
  etiqueta: string;
  puntos: { x: number; y: number }[];
  d: string;
  area: string;
}

const ANCHO = 640;
const ALTO = 300;
const MARGEN = { arriba: 16, derecha: 14, abajo: 34, izquierda: 46 };

/**
 * Gráfico de líneas de presión intraocular (imagen 27).
 *
 * SVG generado a mano: el proyecto evita deliberadamente cualquier librería de
 * gráficos. Rango vertical acotado a 10–40 mmHg, el rango clínico plausible que
 * fija AGENTS.md §4.
 */
@Component({
  selector: 'app-grafico-pio',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './grafico-pio.html',
  styleUrl: './grafico-pio.scss',
})
export class GraficoPioComponent {
  readonly datos = input.required<PuntoEvolucion[]>();

  protected readonly ancho = ANCHO;
  protected readonly alto = ALTO;

  protected readonly margenes = MARGEN;

  /** Eje vertical: de 10 a 40 mmHg, como marca el prototipo (10–18 visibles). */
  protected readonly dominioY = { min: 10, max: 40 };

  protected readonly ejeY = computed(() => {
    const ticks: number[] = [];
    for (let v = 20; v >= this.dominioY.min; v -= 2) {
      ticks.push(v);
    }
    return ticks;
  });

  protected readonly etiquetasX = computed(() => {
    const serie = this.datos();
    return serie.map((p) => {
      const fecha = new Date(`${p.fecha}T00:00:00`);
      return fecha.toLocaleDateString('es-ES', { month: 'short' }).replace('.', '');
    });
  });

  protected readonly areaGrafico = computed(() => ({
    x: MARGEN.izquierda,
    y: MARGEN.arriba,
    ancho: ANCHO - MARGEN.izquierda - MARGEN.derecha,
    alto: ALTO - MARGEN.arriba - MARGEN.abajo,
  }));

  protected readonly series = computed<SerieGrafica[]>(() => {
    const serie = this.datos();
    const area = this.areaGrafico();
    const total = Math.max(serie.length - 1, 1);
    const { min, max } = this.dominioY;

    const x = (i: number) => area.x + (i / total) * area.ancho;
    const y = (valor: number) =>
      area.y + ((max - valor) / (max - min)) * area.alto;

    const construir = (clave: 'pioOd' | 'pioOi', etiqueta: string): SerieGrafica => {
      const puntos = serie.map((p, i) => ({ x: x(i), y: y(p[clave]) }));
      const d = puntos
        .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
        .join(' ');
      const base = area.y + area.alto;
      const areaPath = puntos.length
        ? `${d} L ${puntos[puntos.length - 1]!.x.toFixed(1)} ${base} L ${puntos[0]!.x.toFixed(1)} ${base} Z`
        : '';
      return { clave, etiqueta, puntos, d, area: areaPath };
    };

    return [
      construir('pioOd', 'OD (Right)'),
      construir('pioOi', 'OS (Left)'),
    ];
  });

  /** Rejilla horizontal con su etiqueta en mmHg. */
  protected yDe(valor: number): number {
    const area = this.areaGrafico();
    const { min, max } = this.dominioY;
    return area.y + ((max - valor) / (max - min)) * area.alto;
  }

  protected xDe(indice: number): number {
    const area = this.areaGrafico();
    const total = Math.max(this.datos().length - 1, 1);
    return area.x + (indice / total) * area.ancho;
  }
}