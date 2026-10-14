import { ChangeDetectionStrategy, Component, OnDestroy, OnInit, inject, signal } from '@angular/core';

import { ButtonComponent } from '../../shared/components/ui-button';
import { IconComponent } from '../../shared/components/ui-icon';
import { ContextoPaginaService } from '../../core/services/contexto-pagina.service';
import { PacienteService } from '../../core/services/paciente.service';
import { OftalmologoService } from '../../core/services/oftalmologo.service';
import { Oftalmologo, Paciente } from '../../core/models';
import { AvatarComponent } from '../../shared/components/ui-avatar';

/**
 * Confirmación de cita (imagen 33). Se muestra tras completar el asistente de
 * reserva; los datos provienen del registro recién creado.
 */
@Component({
  selector: 'app-cita-confirmacion',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ButtonComponent, IconComponent, AvatarComponent],
  templateUrl: './confirmacion.html',
  styleUrl: './confirmacion.scss',
})
export class CitaConfirmacionComponent implements OnInit, OnDestroy {
  private readonly contexto = inject(ContextoPaginaService);
  private readonly pacientes = inject(PacienteService);
  private readonly oftalmologos = inject(OftalmologoService);

  protected readonly paciente = signal<Paciente | null>(null);
  protected readonly medico = signal<Oftalmologo | null>(null);

  protected readonly fechaLegible = 'Jueves, 24 de Octubre';
  protected readonly horaLegible = '10:30 AM';

  ngOnInit(): void {
    this.contexto.configurar({ placeholder: '' });

    this.pacientes.obtener(7).subscribe((paciente) => this.paciente.set(paciente));
    this.oftalmologos.obtener(5).subscribe((medico) => this.medico.set(medico));
  }

  ngOnDestroy(): void {
    this.contexto.restablecer();
  }

  protected imprimir(): void {
    window.print();
  }
}
