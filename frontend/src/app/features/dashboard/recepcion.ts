import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { CardComponent } from '../../shared/components/ui-card';
import { IconComponent } from '../../shared/components/ui-icon';
import { BadgeComponent } from '../../shared/components/ui-badge';
import { AvatarComponent } from '../../shared/components/ui-avatar';
import { ButtonComponent } from '../../shared/components/ui-button';
import { TableComponent } from '../../shared/components/ui-table';
import { SkeletonComponent } from '../../shared/components/ui-skeleton';
import { StatComponent } from '../../shared/components/ui-stat';
import { CitaService } from '../../core/services/cita.service';
import { DashboardService } from '../../core/services/dashboard.service';
import { DashboardRecepcion, EstadoCita, TarjetaCita } from '../../core/models';

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
    StatComponent,
  ],
  templateUrl: './recepcion.html',
  styleUrl: './recepcion.scss',
})
export class RecepcionDashboardComponent {
  private readonly dashboard = inject(DashboardService);
  private readonly citas = inject(CitaService);

  protected readonly datos = signal<DashboardRecepcion | null>(null);

  /** Cita cuyo ingreso se está registrando (deshabilita su botón). */
  protected readonly registrando = signal<number | null>(null);
  protected readonly errorIngreso = signal('');

  protected readonly atendidas = computed(
    () => this.datos()?.citasHoy.filter((c) => c.estado === 'COMPLETADA').length ?? 0
  );

  protected readonly medicosLibres = computed(
    () => this.datos()?.medicos.filter((m) => m.estado !== 'OCUPADO').length ?? 0
  );

  /**
   * Check-in: la cita pasa a EN_ESPERA (PATCH /citas/{id}/estado). Antes el
   * botón «Registrar Ingreso» no hacía nada.
   */
  protected registrarIngreso(cita: TarjetaCita): void {
    this.registrando.set(cita.id);
    this.errorIngreso.set('');
    this.citas.cambiarEstado(cita.id, { estado: 'EN_ESPERA' }).subscribe({
      next: () => {
        this.registrando.set(null);
        this.datos.update((d) =>
          d
            ? {
                ...d,
                enEspera: d.enEspera + 1,
                citasHoy: d.citasHoy.map((c) =>
                  c.id === cita.id ? { ...c, estado: 'EN_ESPERA' as EstadoCita } : c
                ),
              }
            : d
        );
      },
      error: () => {
        this.registrando.set(null);
        this.errorIngreso.set(`No se pudo registrar el ingreso de ${cita.pacienteNombre}. Inténtalo de nuevo.`);
      },
    });
  }

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