import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';

import { CardComponent } from '../../shared/components/ui-card';
import { IconComponent } from '../../shared/components/ui-icon';
import { BadgeComponent } from '../../shared/components/ui-badge';
import { ButtonComponent } from '../../shared/components/ui-button';
import { SkeletonComponent } from '../../shared/components/ui-skeleton';
import { GraficoVolumenComponent } from '../../shared/charts/grafico-volumen';
import { DashboardService } from '../../core/services/dashboard.service';
import { DashboardAdmin } from '../../core/models';

/** Panel del administrador (imagen 44): métricas, volumen y accesos. */
@Component({
  selector: 'app-dashboard-admin',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CardComponent,
    IconComponent,
    BadgeComponent,
    ButtonComponent,
    SkeletonComponent,
    GraficoVolumenComponent,
  ],
  templateUrl: './admin.html',
  styleUrl: './admin.scss',
})
export class AdminDashboardComponent {
  private readonly dashboard = inject(DashboardService);

  protected readonly datos = signal<DashboardAdmin | null>(null);

  constructor() {
    this.dashboard.admin().subscribe((respuesta) => this.datos.set(respuesta));
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