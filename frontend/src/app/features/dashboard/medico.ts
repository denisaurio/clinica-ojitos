import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { CardComponent } from '../../shared/components/ui-card';
import { IconComponent } from '../../shared/components/ui-icon';
import { BadgeComponent } from '../../shared/components/ui-badge';
import { AvatarComponent } from '../../shared/components/ui-avatar';
import { ButtonComponent } from '../../shared/components/ui-button';
import { SkeletonComponent } from '../../shared/components/ui-skeleton';
import { StatComponent, TonoStat } from '../../shared/components/ui-stat';
import { DashboardService } from '../../core/services/dashboard.service';
import { DashboardMedico, EstadoCita, IndicadorPanel } from '../../core/models';

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
    StatComponent,
  ],
  templateUrl: './medico.html',
  styleUrl: './medico.scss',
})
export class MedicoDashboardComponent {
  private readonly dashboard = inject(DashboardService);

  protected readonly datos = signal<DashboardMedico | null>(null);

  protected readonly tonos: TonoStat[] = ['azul', 'verde', 'violeta', 'ambar'];
  protected readonly iconos = ['calendar', 'user-check', 'fileText', 'clipboardList'];

  protected readonly hoy = new Intl.DateTimeFormat('es-PE', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
    .format(new Date())
    .replace(/^./, (letra) => letra.toUpperCase());

  /**
   * Indicadores del backend; en modo demostración (sin indicadores) se
   * calculan a partir de la agenda y las listas del propio panel.
   */
  protected readonly indicadores = computed<IndicadorPanel[]>(() => {
    const d = this.datos();
    if (!d) return [];
    if (d.indicadores?.length) return d.indicadores;
    const atendidas = d.citasHoy.filter((c) => c.estado === 'COMPLETADA').length;
    return [
      { etiqueta: 'Citas de hoy', valor: String(d.citasHoy.length) },
      { etiqueta: 'Pacientes atendidos', valor: String(atendidas) },
      { etiqueta: 'Historiales recientes', valor: String(d.historialesRecientes.length) },
      { etiqueta: 'Pendientes', valor: String(d.pendientes.length) },
    ];
  });

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