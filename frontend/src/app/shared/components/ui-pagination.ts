import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';

/**
 * Paginación del prototipo: «Mostrando X a Y de Z», anterior/siguiente y, cuando
 * cabe, la lista de páginas con la actual resaltada.
 */
@Component({
  selector: 'ui-pagination',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="paginacion">
      <span class="paginacion__resumen">{{ resumen() }}</span>

      @if (totalPaginas() > 1) {
        <div class="paginacion__controles">
          <button
            type="button"
            class="paginacion__flecha"
            [disabled]="pagina() === 0"
            aria-label="Página anterior"
            (click)="ir(pagina() - 1)"
          >
            ‹
          </button>

          @for (p of paginasVisibles(); track p) {
            @if (p === -1) {
              <span class="paginacion__puntos">…</span>
            } @else {
              <button
                type="button"
                class="paginacion__pagina"
                [class.paginacion__pagina--activa]="p === pagina()"
                (click)="ir(p)"
              >
                {{ p + 1 }}
              </button>
            }
          }

          <button
            type="button"
            class="paginacion__flecha"
            [disabled]="pagina() >= totalPaginas() - 1"
            aria-label="Página siguiente"
            (click)="ir(pagina() + 1)"
          >
            ›
          </button>
        </div>
      }
    </div>
  `,
  styleUrl: './ui-pagination.scss',
})
export class PaginationComponent {
  /** Índice base 0, igual que el `page` de Spring Data. */
  readonly pagina = input(0);
  readonly totalPaginas = input(1);
  readonly totalElementos = input(0);
  readonly tamanoPagina = input(10);

  readonly paginaCambia = output<number>();

  protected readonly resumen = computed(() => {
    const total = this.totalElementos();
    if (total === 0) {
      return 'Mostrando 0 a 0 de 0 registros';
    }
    const desde = this.pagina() * this.tamanoPagina() + 1;
    const hasta = Math.min(desde + this.tamanoPagina() - 1, total);
    return `Mostrando ${desde} a ${hasta} de ${total} registros`;
  });

  /** Ventana de hasta 5 páginas; `-1` representa los puntos suspensivos. */
  protected readonly paginasVisibles = computed<number[]>(() => {
    const total = this.totalPaginas();
    const actual = this.pagina();
    if (total <= 5) {
      return Array.from({ length: total }, (_, i) => i);
    }
    let inicio = Math.max(0, actual - 2);
    const fin = Math.min(total, inicio + 5);
    inicio = Math.max(0, fin - 5);

    const paginas = Array.from({ length: fin - inicio }, (_, i) => i + inicio);
    if (inicio > 0) {
      paginas.unshift(-1);
    }
    if (fin < total) {
      paginas.push(-1);
    }
    return paginas;
  });

  protected ir(pagina: number): void {
    if (pagina < 0 || pagina >= this.totalPaginas() || pagina === this.pagina()) {
      return;
    }
    this.paginaCambia.emit(pagina);
  }
}