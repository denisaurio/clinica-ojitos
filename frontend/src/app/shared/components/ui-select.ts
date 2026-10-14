import { ChangeDetectionStrategy, Component, forwardRef, input, output, signal } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

import { IconComponent } from './ui-icon';

export interface OpcionSelect {
  valor: string | number;
  etiqueta: string;
}

/** Desplegable nativo estilizado; mantiene la accesibilidad del `<select>`. */
@Component({
  selector: 'ui-select',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => SelectComponent),
      multi: true,
    },
  ],
  template: `
    <label class="campo">
      @if (etiqueta()) {
        <span class="campo__etiqueta">
          {{ etiqueta() }}
          @if (requerido()) {
            <span class="campo__asterisco" aria-hidden="true">*</span>
          }
        </span>
      }

      <span class="campo__caja" [class.campo__caja--error]="error()">
        @if (icono()) {
          <ui-icon class="campo__icono" [nombre]="icono()" [tamano]="16" />
        }
        <select
          class="campo__select"
          [disabled]="deshabilitado()"
          [value]="valorActual()"
          (change)="alCambiar($event)"
          (blur)="onTocado()"
        >
          <option value="" disabled>{{ placeholder() }}</option>
          @for (opcion of opciones(); track opcion.valor) {
            <option [value]="opcion.valor">{{ opcion.etiqueta }}</option>
          }
        </select>
        <ui-icon class="campo__flecha" nombre="chevron-down" [tamano]="16" />
      </span>

      @if (error()) {
        <span class="campo__error">{{ error() }}</span>
      }
    </label>
  `,
  styleUrl: './ui-select.scss',
})
export class SelectComponent implements ControlValueAccessor {
  readonly etiqueta = input('');
  readonly placeholder = input('Seleccione una opción');
  readonly opciones = input<OpcionSelect[]>([]);
  readonly icono = input('');
  readonly requerido = input(false);
  readonly deshabilitado = input(false);
  readonly error = input('');

  /** Emite el valor seleccionado, para pantallas que no usan Reactive Forms. */
  readonly valorCambia = output<string>();

  protected readonly valorActual = signal<string | number>('');

  private readonly onChange = signal<(valor: string) => void>(() => undefined);
  private readonly onTouched = signal<() => void>(() => undefined);

  writeValue(valor: string | number | null): void {
    this.valorActual.set(valor ?? '');
  }

  registerOnChange(fn: (valor: string) => void): void {
    this.onChange.set(fn);
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched.set(fn);
  }

  setDisabledState(deshabilitado: boolean): void {
    // El estado deshabilitado lo fija la propia pantalla.
  }

  protected alCambiar(evento: Event): void {
    const valor = (evento.target as HTMLSelectElement).value;
    this.valorActual.set(valor);
    this.onChange()(valor);
    this.onTouched()();
    this.valorCambia.emit(valor);
  }

  protected onTocado(): void {
    this.onTouched()();
  }
}