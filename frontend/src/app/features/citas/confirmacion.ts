import { ChangeDetectionStrategy, Component, OnDestroy, OnInit, computed, inject } from '@angular/core';

import { ButtonComponent } from '../../shared/components/ui-button';
import { IconComponent } from '../../shared/components/ui-icon';
import { ContextoPaginaService } from '../../core/services/contexto-pagina.service';
import { CitaService } from '../../core/services/cita.service';

/**
 * Confirmación de cita (imagen 33). Se muestra tras completar el asistente de
 * reserva; los datos provienen de la cita recién creada, no de valores fijos.
 */
@Component({
  selector: 'app-cita-confirmacion',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ButtonComponent, IconComponent],
  templateUrl: './confirmacion.html',
  styleUrl: './confirmacion.scss',
})
export class CitaConfirmacionComponent implements OnInit, OnDestroy {
  private readonly contexto = inject(ContextoPaginaService);
  private readonly citas = inject(CitaService);

  protected readonly cita = this.citas.ultimaCita;

  protected readonly fechaLegible = computed(() => {
    const fecha = this.cita()?.fecha;
    if (!fecha) {
      return '—';
    }
    const texto = new Date(`${fecha}T00:00:00`).toLocaleDateString('es-ES', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });
    return texto.charAt(0).toUpperCase() + texto.slice(1);
  });

  protected readonly horaLegible = computed(() => this.hora12(this.cita()?.horaInicio ?? ''));

  ngOnInit(): void {
    this.contexto.configurar({ placeholder: '' });
  }

  ngOnDestroy(): void {
    this.contexto.restablecer();
  }

  protected imprimir(): void {
    window.print();
  }

  /** «10:30» → «10:30 AM»; el backend entrega la hora en formato de 24 h. */
  private hora12(hora: string): string {
    if (!hora) {
      return '—';
    }
    const [h = '0', m = '00'] = hora.split(':');
    const meridiano = Number(h) < 12 ? 'AM' : 'PM';
    const mostrada = Number(h) % 12 === 0 ? 12 : Number(h) % 12;
    return `${String(mostrada).padStart(2, '0')}:${m} ${meridiano}`;
  }
}
