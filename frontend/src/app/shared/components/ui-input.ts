import { ChangeDetectionStrategy, Component, forwardRef, input, signal } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

import { IconComponent } from './ui-icon';

/**
 * Campo de texto del design system con etiqueta, pista, icono y mensaje de
 * error. Implementa `ControlValueAccessor` para usarse directamente en un
 * `FormGroup` de Angular Reactive Forms, con validación en tiempo real.
 */
@Component({
  selector: 'ui-input',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => InputComponent),
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
        <input
          class="campo__input"
          [type]="tipo()"
          [placeholder]="placeholder()"
          [disabled]="deshabilitado()"
          [value]="valorActual()"
          [attr.list]="listaId() || null"
          (input)="alEscribir($event)"
          (blur)="alSalir()"
        />
        @if (icono()) {
          <ui-icon class="campo__sufijo" [nombre]="sufijoIcono()" [tamano]="15" />
        }
      </span>

      @if (error()) {
        <span class="campo__error">{{ error() }}</span>
      } @else if (ayuda()) {
        <span class="campo__ayuda">{{ ayuda() }}</span>
      }
    </label>
  `,
  styleUrl: './ui-input.scss',
})
export class InputComponent implements ControlValueAccessor {
  readonly etiqueta = input('');
  readonly placeholder = input('');
  readonly ayuda = input('');
  readonly icono = input('');
  /** Identificador de un `<datalist>` externo para sugerencias de escritura. */
  readonly listaId = input('');
  readonly sufijoIcono = input('');
  readonly tipo = input<'text' | 'email' | 'password' | 'date' | 'number' | 'tel' | 'search'>('text');
  readonly requerido = input(false);
  readonly deshabilitado = input(false);
  /** Mensaje de error; lo inyecta el formulario al perder el foco. */
  readonly error = input('');

  protected readonly valorActual = signal('');

  private readonly onChange = signal<(valor: string) => void>(() => undefined);
  private readonly onTouched = signal<() => void>(() => undefined);

  writeValue(valor: string | null): void {
    this.valorActual.set(valor ?? '');
  }

  registerOnChange(fn: (valor: string) => void): void {
    this.onChange.set(fn);
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched.set(fn);
  }

  setDisabledState(deshabilitado: boolean): void {
    // El estado deshabilitado lo fija el propio `input` desde la pantalla.
  }

  protected alEscribir(evento: Event): void {
    const valor = (evento.target as HTMLInputElement).value;
    this.valorActual.set(valor);
    this.onChange()(valor);
  }

  protected alSalir(): void {
    this.onTouched()();
  }
}