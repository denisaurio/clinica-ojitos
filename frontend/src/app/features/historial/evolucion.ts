import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  OnInit,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';

import { BadgeComponent } from '../../shared/components/ui-badge';
import { CardComponent } from '../../shared/components/ui-card';
import { IconComponent } from '../../shared/components/ui-icon';
import { SkeletonComponent } from '../../shared/components/ui-skeleton';
import { GraficoPioComponent } from '../../shared/charts/grafico-pio';
import { HistorialService } from '../../core/services/historial.service';
import { PacienteService } from '../../core/services/paciente.service';
import { TratamientoService } from '../../core/services/tratamiento.service';
import { ContextoPaginaService } from '../../core/services/contexto-pagina.service';
import {
  Paciente,
  PuntoEvolucion,
  RegistroAgudeza,
  Tratamiento,
} from '../../core/models';

/**
 * Progreso y evolución (imagen 27): serie de presión intraocular, diagnóstico
 * principal, tratamiento activo y tabla de agudeza visual.
 *
 * Las cifras provienen de `GET /historiales/paciente/{id}/evolucion`; el
 * diagnóstico y los tratamientos, de los endpoints de paciente y tratamiento.
 */
@Component({
  selector: 'app-historial-evolucion',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    BadgeComponent,
    CardComponent,
    IconComponent,
    SkeletonComponent,
    GraficoPioComponent,
  ],
  templateUrl: './evolucion.html',
  styleUrl: './evolucion.scss',
})
export class HistorialEvolucionComponent implements OnInit, OnDestroy {
  private readonly historial = inject(HistorialService);
  private readonly pacientes = inject(PacienteService);
  private readonly tratamientos = inject(TratamientoService);
  private readonly contexto = inject(ContextoPaginaService);

  readonly id = input.required<string>();

  protected readonly paciente = signal<Paciente | null>(null);
  protected readonly serie = signal<PuntoEvolucion[]>([]);
  protected readonly agudeza = signal<RegistroAgudeza[]>([]);
  protected readonly activos = signal<Tratamiento[]>([]);

  ngOnInit(): void {
    // El prototipo rotula esta vista como «Vista del Paciente (Visita)».
    this.contexto.configurar({
      placeholder: '',
      insignia: 'Vista del Paciente (Visita)',
      iconoInsignia: 'eye',
    });

    const id = Number(this.id());

    this.pacientes.obtener(id).subscribe((paciente) => this.paciente.set(paciente));
    this.historial.evolucion(id).subscribe((serie) => this.serie.set(serie));
    this.historial.registrosAgudeza(id).subscribe((registros) => this.agudeza.set(registros));
    this.tratamientos.listarPorPaciente(id).subscribe((items) => this.activos.set(items));
  }

  ngOnDestroy(): void {
    this.contexto.restablecer();
  }

  /** Diagnóstico que se repite a lo largo de la serie del paciente. */
  protected readonly diagnosticoPrincipal = computed(() => {
    const serie = this.serie();
    return serie.length > 0 ? (serie[0].diagnostico as string) : '—';
  });

  /** Fecha del primer registro de la serie, en formato «Oct 2021». */
  protected readonly fechaDiagnostico = computed(() => {
    const serie = this.serie();
    if (serie.length === 0) {
      return '—';
    }
    const d = new Date(`${serie[0].fecha}T00:00:00`);
    const mes = d.toLocaleDateString('es-ES', { month: 'short' }).replace('.', '');
    return `${mes.charAt(0).toUpperCase()}${mes.slice(1)} ${d.getFullYear()}`;
  });

  /** «15 Oct, 2021» a partir de `2021-10-15T…`, como usa el prototipo. */
  protected fechaCorta(fecha: string): string {
    if (!fecha.includes('-')) {
      return fecha;
    }
    const d = new Date(`${fecha}T00:00:00`);
    const mes = d.toLocaleDateString('es-ES', { month: 'short' }).replace('.', '');
    return `${d.getDate()} ${mes}, ${d.getFullYear()}`;
  }
}