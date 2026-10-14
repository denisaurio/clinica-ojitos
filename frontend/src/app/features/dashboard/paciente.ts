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
    return estado === 'CONFIRMADA' ? 'Confirmada' : 'Pendiente';
  }

  /** «OCT 12» — el mes abreviado y el día, como en las tarjetas del prototipo. */
  protected readonly mes = [
    'ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN',
    'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC',
  ];

  protected diaDe(indice: number): string {
    const dias = ['12', '05', '18', '22', '09', '27', '30'];
    return dias[indice % dias.length] as string;
  }
}