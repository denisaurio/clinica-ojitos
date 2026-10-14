import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  OnInit,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { ButtonComponent } from '../../shared/components/ui-button';
import { InputComponent } from '../../shared/components/ui-input';
import { SelectComponent, OpcionSelect } from '../../shared/components/ui-select';
import { CardComponent } from '../../shared/components/ui-card';
import { AvatarComponent } from '../../shared/components/ui-avatar';
import { BadgeComponent } from '../../shared/components/ui-badge';
import { ModalComponent } from '../../shared/components/ui-modal';
import { IconComponent } from '../../shared/components/ui-icon';
import { DemoDataService } from '../../core/services/demo-data.service';
import { CitaService } from '../../core/services/cita.service';
import { OftalmologoService } from '../../core/services/oftalmologo.service';
import { ContextoPaginaService } from '../../core/services/contexto-pagina.service';
import { HitoControl } from '../../core/models';

/**
 * Seguimiento del paciente (imagen 35) con la línea de tiempo de 6 meses y el
 * diálogo de cita de control (imagen 37).
 */
@Component({
  selector: 'app-seguimiento',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    ButtonComponent,
    InputComponent,
    SelectComponent,
    CardComponent,
    AvatarComponent,
    BadgeComponent,
    ModalComponent,
    IconComponent,
  ],
  templateUrl: './seguimiento.html',
  styleUrl: './seguimiento.scss',
})
export class SeguimientoComponent implements OnInit, OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly demo = inject(DemoDataService);
  private readonly citas = inject(CitaService);
  private readonly oftalmologos = inject(OftalmologoService);
  private readonly contexto = inject(ContextoPaginaService);

  /** Ruta `tratamientos/seguimiento/:id`. */
  readonly id = input.required<string>();

  protected readonly hitos = signal<HitoControl[]>([]);
  protected readonly modalAbierto = signal(false);
  protected readonly medicos = signal<OpcionSelect[]>([]);
  protected readonly slots = signal<{ hora: string; libre: boolean }[]>([]);

  protected readonly formularioControl = this.fb.nonNullable.group({
    fecha: ['', [Validators.required]],
    horaInicio: ['', [Validators.required]],
    oftalmologoId: [null as number | null, [Validators.required]],
    notas: [''],
  });

  ngOnInit(): void {
    this.contexto.configurar({
      placeholder: 'Buscar pacientes...',
      insignia: '',
      iconoInsignia: '',
    });

    this.hitos.set(this.demo.hitosDe(Number(this.id())));

    this.oftalmologos.listar('', true).subscribe((items) => {
      this.medicos.set(items.map((o) => ({ valor: o.id, etiqueta: `${o.nombreCompleto} (${o.subespecialidad})` })));
    });

    this.cargarFranjas();
  }

  ngOnDestroy(): void {
    this.contexto.restablecer();
  }

  protected cargarFranjas(): void {
    this.citas.disponibilidad(undefined, '2024-09-15').subscribe((slots) => {
      this.slots.set(
        slots.map((s) => ({ hora: this.horaLegible(s.horaInicio), libre: s.estado === 'FREE' }))
      );
    });
  }

  protected readonly variantes: Record<HitoControl['estado'], 'primario' | 'success' | 'warning' | 'neutro'> = {
    COMPLETADO: 'primario',
    MEJORA: 'success',
    SIN_CAMBIOS: 'warning',
    PENDIENTE: 'neutro',
  };

  protected readonly etiquetas: Record<HitoControl['estado'], string> = {
    COMPLETADO: 'Completado',
    MEJORA: 'Mejora (PIO Baja)',
    SIN_CAMBIOS: 'Sin Cambios',
    PENDIENTE: 'Pendiente',
  };

  protected readonly iconos: Record<HitoControl['estado'], string> = {
    COMPLETADO: 'check',
    MEJORA: 'trending-down',
    SIN_CAMBIOS: 'minus',
    PENDIENTE: 'clock',
  };

  /** Porcentaje de la línea hasta cada hito (4 hitos → 0 %, 33 %, 66 %, 100 %). */
  protected posicion(indice: number, total: number): number {
    return total <= 1 ? 50 : (indice / (total - 1)) * 100;
  }

  protected horaLegible(hora: string): string {
    const [h = '9', m = '00'] = hora.split(':');
    const meridiano = Number(h) < 12 ? 'AM' : 'PM';
    const displayed = Number(h) % 12 === 0 ? 12 : Number(h) % 12;
    return `${String(displayed).padStart(2, '0')}:${m} ${meridiano}`;
  }

  protected confirmarControl(): void {
    if (this.formularioControl.invalid) {
      this.formularioControl.markAllAsTouched();
      return;
    }
    this.modalAbierto.set(false);
  }

  protected readonly nombrePaciente = computed(() => 'María García S.');
}