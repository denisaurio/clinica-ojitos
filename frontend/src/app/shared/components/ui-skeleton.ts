import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/** Bloques grises de carga (imagen 28, tercera tarjeta de la cronología). */
@Component({
  selector: 'ui-skeleton',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="esqueleto" [style.padding]="padding()">
      @for (indice of indices(); track indice) {
        <div
          class="esqueleto__barra"
          [style.width]="anchoDe(indice)"
          [style.height]="alto()"
        ></div>
      }
    </div>
  `,
  styleUrl: './ui-skeleton.scss',
})
export class SkeletonComponent {
  readonly lineas = input(3);
  readonly alto = input('12px');
  readonly padding = input('0');

  /** Índices 0..n-1: `lineas()` es un número, no una colección. */
  protected readonly indices = computed(() =>
    Array.from({ length: Math.max(this.lineas(), 0) }, (_, i) => i)
  );

  /** La primera barra suele ser un título: más corta que el cuerpo. */
  protected anchoDe(indice: number): string {
    const patrones = ['38%', '92%', '74%', '86%', '60%', '80%'];
    return indice === 0 ? (patrones[0] as string) : (patrones[indice % patrones.length] as string);
  }
}