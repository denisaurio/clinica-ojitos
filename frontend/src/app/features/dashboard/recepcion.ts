import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { CardComponent } from '../../shared/components/ui-card';
import { IconComponent } from '../../shared/components/ui-icon';
import { BadgeComponent } from '../../shared/components/ui-badge';
import { AvatarComponent } from '../../shared/components/ui-avatar';
import { ButtonComponent } from '../../shared/components/ui-button';
import { TableComponent } from '../../shared/components/ui-table';
import { SkeletonComponent } from '../../shared/components/ui-skeleton';
import { DashboardService } from '../../core/services/dashboard.service';
import { DashboardRecepcion, EstadoCita } from '../../core/models';

/** Panel de recepción y triaje (imagen 46). */
@Component({
  selector: 'app-dashboard-recepcion',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    CardComponent,
    IconComponent,
    BadgeComponent,
    AvatarComponent,
    ButtonComponent,
    TableComponent,
    SkeletonComponent,
  ],
  templateUrl: './recepcion.html',
  styleUrl: './recepcion.scss',
})
export class RecepcionDashboardComponent {
  private readonly dashboard = inject(DashboardService);

  protected readonly datos = signal<DashboardRecepcion | null>(null);

  constructor() {
    this.dashboard.recepcion().subscribe((respuesta) => this.datos.set(respuesta));
  }

  protected readonly columnas = ['Hora', 'Paciente', 'Motivo', 'Doctor', 'Estado', 'Acción'];

  protected variante(estado: EstadoCita): 'success' | 'warning' | 'info' | 'neutro' | 'danger' {
    switch (estado) {
      case 'EN_CURSO':
        return 'info';
      case 'EN_ESPERA':
        return 'success';
      case 'CANCELADA':
        return 'danger';
      default:
        return 'warning';
    }
  }

  protected etiqueta(estado: EstadoCita): string {
    const textos: Partial<Record<EstadoCita, string>> = {
      EN_ESPERA: 'En Espera',
      EN_CURSO: 'En Consulta',
      PROGRAMADA: 'Pendiente',
      CONFIRMADA: 'Confirmada',
      COMPLETADA: 'Completada',
      CANCELADA: 'Cancelada',
      NO_ASISTIO: 'No Asistió',
    };
    return textos[estado] ?? estado;
  }
}