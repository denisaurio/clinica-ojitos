import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';

import { CardComponent } from '../../shared/components/ui-card';
import { IconComponent } from '../../shared/components/ui-icon';
import { BadgeComponent } from '../../shared/components/ui-badge';
import { ButtonComponent } from '../../shared/components/ui-button';
import { SkeletonComponent } from '../../shared/components/ui-skeleton';
import { DashboardService } from '../../core/services/dashboard.service';
import { DashboardPaciente, EstadoCita } from '../../core/models';

/** Portal del paciente (imagen 47): solo lectura de su propia información. */
@Component({
  selector: 'app-dashboard-paciente',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CardComponent, IconComponent, BadgeComponent, ButtonComponent, SkeletonComponent],
  templateUrl: './paciente.html',
  styleUrl: './paciente.scss',
})
export class PacienteDashboardComponent {
  private readonly dashboard = inject(DashboardService);

  protected readonly datos = signal<DashboardPaciente | null>(null);

  constructor() {
    this.dashboard.paciente().subscribe((respuesta) => this.datos.set(respuesta));
  }

  protected variante(estado: EstadoCita): 'success' | 'warning' {
    return estado === 'CONFIRMADA' ? 'success' : 'warning';
  }

  protected etiqueta(estado: EstadoCita): string {
    const textos: Partial<Record<EstadoCita, string>> = {
      CONFIRMADA: 'Confirmada', PROGRAMADA: 'Programada', EN_ESPERA: 'En espera',
      EN_CURSO: 'En consulta', COMPLETADA: 'Completada', CANCELADA: 'Cancelada',
    };
    return textos[estado] ?? estado;
  }

  private static readonly MESES = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'];

  /**
   * «NOV» y «20» de la fecha REAL de la cita (AAAA-MM-DD). Antes el mes salía
   * de la posición en la lista y el día de una lista fija de números.
   */
  protected mesDe(fecha?: string): string {
    const m = Number(fecha?.slice(5, 7));
    return m ? PacienteDashboardComponent.MESES.at(m - 1) ?? '—' : '—';
  }

  protected diaDe(fecha?: string): string {
    return fecha?.slice(8, 10) ?? '—';
  }
}