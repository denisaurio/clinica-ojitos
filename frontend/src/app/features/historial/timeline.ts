import { ChangeDetectionStrategy, Component, OnDestroy, OnInit, inject, input, signal } from '@angular/core';

import { ButtonComponent } from '../../shared/components/ui-button';
import { BadgeComponent } from '../../shared/components/ui-badge';
import { AvatarComponent } from '../../shared/components/ui-avatar';
import { IconComponent } from '../../shared/components/ui-icon';
import { PaginationComponent } from '../../shared/components/ui-pagination';
import { SkeletonComponent } from '../../shared/components/ui-skeleton';
import { PacienteService } from '../../core/services/paciente.service';
import { HistorialService } from '../../core/services/historial.service';
import { ContextoPaginaService } from '../../core/services/contexto-pagina.service';
import { Consulta, PageResponse, Paciente } from '../../core/models';

/**
 * Historial de consultas en línea de tiempo (imagen 28).
 *
 * La última tarjeta está marcada como `ÚLTIMA` y la tercera se dibuja como
 * esqueleto de carga, tal y como documenta el prototipo.
 */
@Component({
  selector: 'app-historial-timeline',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ButtonComponent,
    BadgeComponent,
    AvatarComponent,
    IconComponent,
    PaginationComponent,
    SkeletonComponent,
  ],
  templateUrl: './timeline.html',
  styleUrl: './timeline.scss',
})
export class HistorialTimelineComponent implements OnInit, OnDestroy {
  private readonly pacientes = inject(PacienteService);
  private readonly historial = inject(HistorialService);
  private readonly contexto = inject(ContextoPaginaService);

  readonly id = input.required<string>();

  protected readonly paciente = signal<Paciente | null>(null);
  protected readonly pagina = signal(0);
  protected readonly tamanoPagina = 10;
  protected readonly resultado = signal<PageResponse<Consulta> | null>(null);

  ngOnInit(): void {
    this.contexto.configurar({ placeholder: '' });

    const id = Number(this.id());
    this.pacientes.obtener(id).subscribe((paciente) => this.paciente.set(paciente));
    this.cargar();
  }

  ngOnDestroy(): void {
    this.contexto.restablecer();
  }

  protected cargar(): void {
    this.historial
      .listar(Number(this.id()), this.pagina(), this.tamanoPagina)
      .subscribe((respuesta) => this.resultado.set(respuesta));
  }

  protected cambiarPagina(pagina: number): void {
    this.pagina.set(pagina);
    this.cargar();
  }

  protected iniciales(nombre: string): string {
    return nombre
      .replace(/^(Dr\.|Dra\.)\s*/i, '')
      .split(/\s+/)
      .slice(0, 2)
      .map((p) => p.charAt(0).toUpperCase())
      .join('');
  }

  protected sango(nombre: string): string {
    const partes = nombre.replace(/^(Dr\.|Dra\.)\s*/i, '').split(/\s+/);
    return (partes[partes.length - 1] ?? '').charAt(0).toUpperCase();
  }

  /** Imprime la consulta en el formato `dd/mm/aaaa` a partir de la fecha ISO. */
  protected fechaIso(consulta: Consulta): string {
    const bruto = consulta.fecha.match(/\d{4}-\d{2}-\d{2}/);
    if (!bruto) {
      return consulta.fecha;
    }
    const [anio, mes, dia] = bruto[0].split('-');
    return `${dia}/${mes}/${anio}`;
  }
}