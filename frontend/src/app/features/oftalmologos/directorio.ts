import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { ReactiveFormsModule, FormControl } from '@angular/forms';
import { Router } from '@angular/router';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

import { ButtonComponent } from '../../shared/components/ui-button';
import { CardComponent } from '../../shared/components/ui-card';
import { TableComponent } from '../../shared/components/ui-table';
import { AvatarComponent } from '../../shared/components/ui-avatar';
import { BadgeComponent } from '../../shared/components/ui-badge';
import { PaginationComponent } from '../../shared/components/ui-pagination';
import { EmptyStateComponent } from '../../shared/components/ui-empty-state';
import { IconComponent } from '../../shared/components/ui-icon';
import { OftalmologoService } from '../../core/services/oftalmologo.service';
import { ContextoPaginaService } from '../../core/services/contexto-pagina.service';
import { Oftalmologo } from '../../core/models';

/**
 * Directorio de oftalmólogos (imagen 38): buscador, tabla con estado y menú de
 * tres puntos. Los subespecialidades provienen del catálogo, no del `ENUM`.
 */
@Component({
  selector: 'app-oftalmologos-directorio',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    ButtonComponent,
    CardComponent,
    TableComponent,
    AvatarComponent,
    BadgeComponent,
    PaginationComponent,
    EmptyStateComponent,
    IconComponent,
  ],
  templateUrl: './directorio.html',
  styleUrl: './directorio.scss',
})
export class OftalmologosDirectorioComponent implements OnInit, OnDestroy {
  private readonly oftalmologos = inject(OftalmologoService);
  private readonly router = inject(Router);
  private readonly contexto = inject(ContextoPaginaService);

  protected readonly columnas = [
    'Oftalmólogo',
    'N.º de Colegiado',
    'Subespecialidad',
    'Estado',
    'Acciones',
  ];

  protected readonly medicos = signal<Oftalmologo[]>([]);
  protected readonly pagina = signal(0);
  protected readonly tamanoPagina = 3;
  protected readonly menuAbierto = signal<number | null>(null);

  protected readonly buscador = new FormControl('', { nonNullable: true });

  ngOnInit(): void {
    this.contexto.configurar({
      placeholder: 'Buscar médicos, matricula o subespecialidad...',
      textoEnlace: 'Soporte',
      accion: { texto: 'Nuevo Registro', destino: '/oftalmologos/nuevo', variante: 'primario' },
    });

    this.buscador.valueChanges
      .pipe(debounceTime(250), distinctUntilChanged())
      .subscribe(() => {
        this.pagina.set(0);
        this.cargar();
      });

    this.cargar();
  }

  ngOnDestroy(): void {
    this.contexto.restablecer();
  }

  protected cargar(): void {
    this.oftalmologos
      .listar(this.buscador.value, null)
      .subscribe((items) => this.medicos.set(items));
  }

  /** Ventana de la tabla; el prototipo muestra 3 filas por página. */
  protected readonly visibles = computed(() => {
    const todos = this.medicos();
    const inicio = this.pagina() * this.tamanoPagina;
    return todos.slice(inicio, inicio + this.tamanoPagina);
  });

  protected readonly totalPaginas = computed(() =>
    Math.max(1, Math.ceil(this.medicos().length / this.tamanoPagina))
  );

  protected cambiarPagina(pagina: number): void {
    this.pagina.set(pagina);
  }

  protected alternarMenu(id: number): void {
    this.menuAbierto.update((actual) => (actual === id ? null : id));
  }

  protected irA(ruta: string): void {
    this.menuAbierto.set(null);
    this.router.navigateByUrl(ruta);
  }

  protected desactivar(medico: Oftalmologo): void {
    this.menuAbierto.set(null);
    this.oftalmologos.desactivar(medico.id).subscribe(() => this.cargar());
  }

  protected iniciales(nombre: string): string {
    return nombre
      .replace(/^(Dr\.|Dra\.)\s*/i, '')
      .split(/\s+/)
      .slice(0, 2)
      .map((p) => p.charAt(0).toUpperCase())
      .join('');
  }
}