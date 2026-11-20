import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { Subject, debounceTime, distinctUntilChanged, startWith, switchMap } from 'rxjs';

import { AvatarComponent } from '../../shared/components/ui-avatar';
import { IconComponent } from '../../shared/components/ui-icon';
import { SkeletonComponent } from '../../shared/components/ui-skeleton';
import { PacienteService } from '../../core/services/paciente.service';
import { Paciente } from '../../core/models';

/**
 * Entrada al módulo de Historial Médico (RF-02): primero se elige el paciente.
 * Antes la ruta /historial redirigía siempre al paciente 5.
 */
@Component({
  selector: 'app-historial-seleccion',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, AvatarComponent, IconComponent, SkeletonComponent],
  template: `
    <div class="page">
      <header class="page-head">
        <div>
          <h1 class="page-title">Historial Médico</h1>
          <p class="page-subtitle">Elige un paciente para ver su línea de tiempo clínica.</p>
        </div>
      </header>

      <label class="buscador">
        <ui-icon nombre="search" [tamano]="18" />
        <input
          type="search"
          placeholder="Buscar por nombre o documento…"
          autocomplete="off"
          (input)="buscar($any($event.target).value)"
        />
      </label>

      @if (cargando()) {
        <ui-skeleton [lineas]="4" alto="64px" padding="8px 0" />
      } @else if (error()) {
        <p class="aviso">{{ error() }}</p>
      } @else {
        <ul class="pacientes">
          @for (p of pacientes(); track p.id) {
            <li>
              <a class="paciente" [routerLink]="['/historial/paciente', p.id]">
                <ui-avatar [iniciales]="iniciales(p.nombreCompleto)" tamano="md" />
                <span class="paciente__datos">
                  <span class="paciente__nombre">{{ p.nombreCompleto }}</span>
                  <span class="paciente__meta">
                    {{ p.documento }}@if (p.edad) { · {{ p.edad }} años }
                  </span>
                </span>
                <span class="paciente__ir">
                  Ver historial
                  <ui-icon nombre="chevron-right" [tamano]="16" />
                </span>
              </a>
            </li>
          } @empty {
            <li class="vacio">No se encontraron pacientes con ese criterio.</li>
          }
        </ul>
      }
    </div>
  `,
  styleUrl: './seleccion.scss',
})
export class HistorialSeleccionComponent {
  private readonly pacientesApi = inject(PacienteService);
  private readonly termino$ = new Subject<string>();

  protected readonly pacientes = signal<Paciente[]>([]);
  protected readonly cargando = signal(true);
  protected readonly error = signal('');

  constructor() {
    this.termino$
      .pipe(
        startWith(''),
        debounceTime(250),
        distinctUntilChanged(),
        switchMap((termino) => {
          this.cargando.set(true);
          return this.pacientesApi.listar(termino.trim(), 0, 24);
        }),
        takeUntilDestroyed(inject(DestroyRef))
      )
      .subscribe({
        next: (pagina) => {
          this.pacientes.set(pagina.content);
          this.error.set('');
          this.cargando.set(false);
        },
        error: () => {
          this.error.set('No se pudo cargar la lista de pacientes. Inténtalo de nuevo.');
          this.cargando.set(false);
        },
      });
  }

  protected buscar(texto: string): void {
    this.termino$.next(texto);
  }

  protected iniciales(nombre: string): string {
    return nombre
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p.charAt(0).toUpperCase())
      .join('');
  }
}
