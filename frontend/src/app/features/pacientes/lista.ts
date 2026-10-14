import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { debounceTime, distinctUntilChanged, switchMap } from 'rxjs/operators';

import { ButtonComponent } from '../../shared/components/ui-button';
import { CardComponent } from '../../shared/components/ui-card';
import { InputComponent } from '../../shared/components/ui-input';
import { TableComponent } from '../../shared/components/ui-table';
import { AvatarComponent } from '../../shared/components/ui-avatar';
import { BadgeComponent } from '../../shared/components/ui-badge';
import { PaginationComponent } from '../../shared/components/ui-pagination';
import { EmptyStateComponent } from '../../shared/components/ui-empty-state';
import { SkeletonComponent } from '../../shared/components/ui-skeleton';
import { PacienteService } from '../../core/services/paciente.service';
import { PageResponse, Paciente } from '../../core/models';

/**
 * Listado de pacientes (imagen 24): buscador, tabla, paginación y el ejemplo de
 * estado vacío que el prototipo documenta debajo de la tabla.
 */
@Component({
  selector: 'app-pacientes-lista',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    ButtonComponent,
    CardComponent,
    InputComponent,
    TableComponent,
    AvatarComponent,
    BadgeComponent,
    PaginationComponent,
    EmptyStateComponent,
    SkeletonComponent,
  ],
  templateUrl: './lista.html',
  styleUrl: './lista.scss',
})
export class PacientesListaComponent implements OnInit {
  private readonly pacientes = inject(PacienteService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  protected readonly columnas = ['Nombre', 'DNI', 'Edad', 'Contacto', 'Seguro', 'Acciones'];

  protected readonly pagina = signal(0);
  protected readonly tamanoPagina = 10;
  protected readonly cargando = signal(true);
  protected readonly resultado = signal<PageResponse<Paciente> | null>(null);

  /** Filas a pintar: vacía mientras no haya respuesta del backend. */
  protected readonly filas = computed<Paciente[]>(() => this.resultado()?.content ?? []);

  /** Datos de paginación derivados de la respuesta, ya sin nulos. */
  protected readonly paginaActual = computed(() => this.resultado()?.number ?? 0);
  protected readonly totalPaginas = computed(() => this.resultado()?.totalPages ?? 1);
  protected readonly totalElementos = computed(() => this.resultado()?.totalElements ?? 0);
  protected readonly tamanoRespuesta = computed(() => this.resultado()?.size ?? this.tamanoPagina);

  /** Búsqueda en vivo con rebote, para no saturar el backend en cada tecla. */
  protected readonly buscador = new FormControl('', { nonNullable: true });

  ngOnInit(): void {
    this.route.queryParamMap.subscribe((params) => {
      const inicial = params.get('buscar');
      if (inicial) {
        this.buscador.setValue(inicial, { emitEvent: false });
      }
    });

    this.buscador.valueChanges
      .pipe(debounceTime(250), distinctUntilChanged())
      .subscribe(() => {
        this.pagina.set(0);
        this.cargar();
      });

    this.cargar();
  }

  protected cargar(): void {
    this.cargando.set(true);
    this.pacientes
      .listar(this.buscador.value, this.pagina(), this.tamanoPagina)
      .subscribe((respuesta) => {
        this.resultado.set(respuesta);
        this.cargando.set(false);
      });
  }

  protected cambiarPagina(pagina: number): void {
    this.pagina.set(pagina);
    this.cargar();
  }

  protected limpiarBusqueda(): void {
    this.buscador.setValue('');
    this.buscador.markAsTouched();
  }

  protected iniciales(nombre: string): string {
    return nombre
      .split(/\s+/)
      .slice(0, 2)
      .map((p) => p.charAt(0).toUpperCase())
      .join('');
  }

  protected verPerfil(id: number): void {
    this.router.navigate(['/pacientes/perfil', id]);
  }
}