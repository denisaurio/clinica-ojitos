import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * Tabla del prototipo: cabecera en gris claro con versalitas, filas separadas
 * por una línea `$border` y la última celda de acciones a la derecha.
 *
 * Las filas se proyectan desde el componente padre (`<tr>` con sus `<td>`), de
 * modo que cada pantalla decide sus celdas sin acoplar la tabla a este
 * componente.
 */
@Component({
  selector: 'ui-table',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [],
  template: `
    <div class="tabla-envoltorio">
      <table class="tabla">
        <thead>
          <tr>
            @for (columna of columnas(); track columna) {
              <th scope="col">{{ columna }}</th>
            }
          </tr>
        </thead>
        <tbody>
          <ng-content />
        </tbody>
      </table>
    </div>
    <ng-content select="[slot=pie]" />
  `,
  styleUrl: './ui-table.scss',
})
export class TableComponent {
  readonly columnas = input.required<string[]>();
}