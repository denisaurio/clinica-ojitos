import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { CardComponent } from '../../shared/components/ui-card';
import { IconComponent } from '../../shared/components/ui-icon';
import { BadgeComponent } from '../../shared/components/ui-badge';
import { AvatarComponent } from '../../shared/components/ui-avatar';
import { ButtonComponent } from '../../shared/components/ui-button';
import { SkeletonComponent } from '../../shared/components/ui-skeleton';
import { DashboardService } from '../../core/services/dashboard.service';
import { DashboardMedico, EstadoCita } from '../../core/models';

/** Panel del oftalmólogo (imagen 45): agenda del día, pendientes y accesos. */
@Component({
  selector: 'app-dashboard-medico',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    CardComponent,
    IconComponent,
    BadgeComponent,
    AvatarComponent,
    ButtonComponent,
    SkeletonComponent,
  ],
  templateUrl: './medico.html',
  styleUrl: './medico.scss',
})
export class MedicoDashboardComponent {
  private readonly dashboard = inject(DashboardService);

  protected readonly datos = signal<DashboardMedico | null>(null);

  constructor() {
    this.dashboard.medico().subscribe((respuesta) => this.datos.set(respuesta));
  }

  protected variante(estado: EstadoCita): 'success' | 'warning' | 'info' | 'danger' | 'neutro' {
    switch (estado) {
      case 'CONFIRMADA':
      case 'COMPLETADA':
        return 'success';
      case 'EN_ESPERA':
      case 'EN_CURSO':
        return 'warning';
      case 'CANCELADA':
      case 'NO_ASISTIO':
        return 'danger';
      default:
        return 'info';
    }
  }

  /** «09:00» → «AM». El prototipo muestra la hora en formato 12 h. */
  protected meridiano(hora: string): string {
    return Number(hora.slice(0, 2)) < 12 ? 'AM' : 'PM';
  }

  protected etiqueta(estado: EstadoCita): string {
    const textos: Partial<Record<EstadoCita, string>> = {
      CONFIRMADA: 'Confirmado',
      PROGRAMADA: 'Programada',
      EN_ESPERA: 'En Espera',
      EN_CURSO: 'En Consulta',
      COMPLETADA: 'Completada',
      CANCELADA: 'Cancelada',
      NO_ASISTIO: 'No Asistió',
    };
    return textos[estado] ?? estado;
  }
}