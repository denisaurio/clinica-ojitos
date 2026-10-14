import { Injectable, signal } from '@angular/core';

import { VarianteBoton } from '../../shared/components/ui-button';

export interface AccionTopbar {
  texto: string;
  destino: string;
  variante: VarianteBoton;
}

export interface ConfiguracionTopbar {
  /** Texto del buscador global; cadena vacía para ocultarlo. */
  placeholder: string;
  /** Etiqueta informativa a la izquierda (p. ej. «Vista del Paciente»). */
  insignia: string;
  iconoInsignia: string;
  /** Antetítulo de contexto, p. ej. «Portal de Administración». */
  antetitulo: string;
  /** Enlace de texto antes del botón, p. ej. «Soporte». */
  textoEnlace: string;
  /** Acción principal de la derecha, p. ej. «Nuevo Registro». */
  accion: AccionTopbar | null;
}

const POR_DEFECTO: ConfiguracionTopbar = {
  placeholder: 'Buscar pacientes...',
  insignia: '',
  iconoInsignia: '',
  antetitulo: '',
  textoEnlace: '',
  accion: null,
};

/**
 * Permite que cada pantalla configure la barra superior, tal y como hace el
 * prototipo: el panel del administrador enseña «Soporte» y un botón de alta, la
 * ficha de evolución una etiqueta de visita, y así sucesivamente.
 *
 * Lo consume el `shell`, de modo que evita duplicar la barra en cada pantalla.
 */
@Injectable({ providedIn: 'root' })
export class ContextoPaginaService {
  private readonly _config = signal<ConfiguracionTopbar>(POR_DEFECTO);

  readonly config = this._config.asReadonly();

  configurar(parcial: Partial<ConfiguracionTopbar>): void {
    this._config.set({ ...this._config(), ...parcial });
  }

  /** Vuelve a la barra por defecto; lo llama cada pantalla al destruirse. */
  restablecer(): void {
    this._config.set(POR_DEFECTO);
  }
}