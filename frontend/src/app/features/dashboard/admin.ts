import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';

import { CardComponent } from '../../shared/components/ui-card';
import { StatComponent } from '../../shared/components/ui-stat';
import { IconComponent } from '../../shared/components/ui-icon';
import { BadgeComponent } from '../../shared/components/ui-badge';
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
    StatComponent,
    IconComponent,
    BadgeComponent,
    SkeletonComponent,
    GraficoVolumenComponent,
  ],
  templateUrl: './admin.html',
  styleUrl: './admin.scss',
})
export class AdminDashboardComponent {
  private readonly dashboard = inject(DashboardService);

  protected readonly datos = signal<DashboardAdmin | null>(null);

  /** Intentos fallidos dentro de los accesos recientes que devuelve el panel. */
  protected readonly fallidos = computed(
    () => this.datos()?.intentosAcceso.filter((i) => i.resultado === 'FALLIDO').length ?? 0
  );

  protected readonly hoy = new Intl.DateTimeFormat('es-PE', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
    .format(new Date())
    .replace(/^./, (letra) => letra.toUpperCase());

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