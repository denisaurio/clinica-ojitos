import { ChangeDetectionStrategy, Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { DatePipe } from '@angular/common';

import { ButtonComponent } from '../../shared/components/ui-button';
import { InputComponent } from '../../shared/components/ui-input';
import { SelectComponent, OpcionSelect } from '../../shared/components/ui-select';
import { CardComponent } from '../../shared/components/ui-card';
import { StepperComponent, PasoStepper } from '../../shared/components/ui-stepper';
import { AlertComponent } from '../../shared/components/ui-alert';
import { IconComponent } from '../../shared/components/ui-icon';
import { CitaService } from '../../core/services/cita.service';
import { OftalmologoService } from '../../core/services/oftalmologo.service';
import { PacienteService } from '../../core/services/paciente.service';
import { ContextoPaginaService } from '../../core/services/contexto-pagina.service';
import { SlotDisponibilidad } from '../../core/models';

interface DiaCalendario {
  iso: string;
  numero: number;
  delMes: boolean;
  seleccionado: boolean;
}

/**
 * Reserva de cita en tres pasos (imagen 32): especialista, fecha y franja.
 * Las franjas ocupadas llegan del backend como `estado: "BOOKED"`; el frontend
 * solo las pinta, la validación real del cruce de horarios es del servidor (RF3.2).
 */
@Component({
  selector: 'app-cita-reservar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    DatePipe,
    ButtonComponent,
    InputComponent,
    SelectComponent,
    CardComponent,
    StepperComponent,
    AlertComponent,
    IconComponent,
  ],
  templateUrl: './reservar.html',
  styleUrl: './reservar.scss',
})
export class CitaReservarComponent implements OnInit, OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly citas = inject(CitaService);
  private readonly oftalmologos = inject(OftalmologoService);
  private readonly pacientes = inject(PacienteService);
  private readonly router = inject(Router);
  private readonly contexto = inject(ContextoPaginaService);

  protected readonly paso = signal(1);
  protected readonly medicos = signal<OpcionSelect[]>([]);
  protected readonly pacientesOpciones = signal<OpcionSelect[]>([]);
  protected readonly slots = signal<SlotDisponibilidad[]>([]);
  protected readonly slotSeleccionado = signal<string>('');
  protected readonly cargando = signal(false);
  protected readonly error = signal('');

  /** Fecha por defecto del prototipo: sábado 14 de octubre de 2023. */
  private readonly mesActual = new Date(2023, 9, 1);
  protected readonly mes = signal(new Date(2023, 9, 1));

  protected readonly formulario = this.fb.nonNullable.group({
    oftalmologoId: [null as number | null, [Validators.required]],
    pacienteId: [7 as number | null, [Validators.required]],
    fecha: ['2023-10-14', [Validators.required]],
    horaInicio: ['', [Validators.required]],
    tipoConsulta: ['', [Validators.required]],
    motivo: [''],
  });

  ngOnInit(): void {
    this.contexto.configurar({ placeholder: '' });

    this.oftalmologos.listar('', true).subscribe((items) => {
      this.medicos.set(items.map((o) => ({ valor: o.id, etiqueta: o.nombreCompleto })));
    });

    this.pacientes.listar('', 0, 50).subscribe((pagina) => {
      this.pacientesOpciones.set(
        pagina.content.map((p) => ({ valor: p.id, etiqueta: p.nombreCompleto }))
      );
    });

    this.cargarDisponibilidad('2023-10-14');
  }

  ngOnDestroy(): void {
    this.contexto.restablecer();
  }

  protected readonly pasos = (): PasoStepper[] => [
    { etiqueta: 'Detalles', activo: this.paso() === 1, completado: this.paso() > 1 },
    { etiqueta: 'Datos del Paciente', activo: this.paso() === 2, completado: this.paso() > 2 },
    { etiqueta: 'Confirmación', activo: this.paso() === 3 },
  ];

  protected get c() {
    return this.formulario.controls;
  }

  /* ------------------------------------------------------- Calendario */

  protected readonly tituloMes = computed(() => {
    const mes = this.mes();
    const nombre = mes.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
    return nombre.charAt(0).toUpperCase() + nombre.slice(1);
  });

  /** Rejilla de 42 celdas (6 semanas) alineada con el lunes como primer día. */
  protected readonly calendario = computed<DiaCalendario[]>(() => {
    const mes = this.mes();
    const primero = new Date(mes.getFullYear(), mes.getMonth(), 1);
    const desplazamiento = (primero.getDay() + 6) % 7;

    const celdas: DiaCalendario[] = [];
    for (let i = 0; i < 42; i++) {
      const dia = new Date(primero);
      dia.setDate(dia.getDate() - desplazamiento + i);
      const iso = this.aIso(dia);
      celdas.push({
        iso,
        numero: dia.getDate(),
        delMes: dia.getMonth() === mes.getMonth(),
        seleccionado: iso === this.c.fecha.value,
      });
    }
    return celdas;
  });

  protected diasSemana = ['LU', 'MA', 'MI', 'JU', 'VI', 'SA', 'DO'];

  protected mesAnterior(): void {
    this.mes.update((actual) => new Date(actual.getFullYear(), actual.getMonth() - 1, 1));
  }

  protected mesSiguiente(): void {
    this.mes.update((actual) => new Date(actual.getFullYear(), actual.getMonth() + 1, 1));
  }

  protected seleccionarDia(dia: DiaCalendario): void {
    if (!dia.delMes) {
      return;
    }
    this.c.fecha.setValue(dia.iso);
    this.slotSeleccionado.set('');
    this.cargarDisponibilidad(dia.iso);
  }

  /* --------------------------------------------------------- Franjas */

  protected readonly manana = computed(() =>
    this.slots().filter((s) => Number(s.horaInicio.slice(0, 2)) < 12)
  );
  protected readonly tarde = computed(() =>
    this.slots().filter((s) => Number(s.horaInicio.slice(0, 2)) >= 12)
  );

  protected cargarDisponibilidad(fecha: string): void {
    this.cargando.set(true);
    this.citas.disponibilidad(this.c.oftalmologoId.value ?? undefined, fecha).subscribe((slots) => {
      this.slots.set(slots);
      this.cargando.set(false);
    });
  }

  protected seleccionarSlot(slot: SlotDisponibilidad): void {
    if (slot.estado !== 'FREE') {
      return;
    }
    this.slotSeleccionado.set(slot.horaInicio);
    this.c.horaInicio.setValue(slot.horaInicio);
  }

  /** «09:00» → «09:00»; el prototipo lo muestra sin sufijo en la rejilla. */
  protected horaLegible(hora: string): string {
    return hora;
  }

  protected nombreMedico(): string {
    const id = this.c.oftalmologoId.value;
    return this.medicos().find((m) => m.valor === id)?.etiqueta ?? '—';
  }

  protected nombrePaciente(): string {
    const id = this.c.pacienteId.value;
    return this.pacientesOpciones().find((p) => p.valor === id)?.etiqueta ?? '—';
  }

  protected seleccionada(hora: string): boolean {
    return this.slotSeleccionado() === hora;
  }

  /* ------------------------------------------------------- Navegación */

  protected siguiente(): void {
    if (this.paso() === 1 && (this.c.oftalmologoId.value === null || !this.c.horaInicio.value)) {
      this.c.oftalmologoId.markAsTouched();
      this.c.horaInicio.markAsTouched();
      return;
    }
    if (this.paso() < 3) {
      this.paso.update((valor) => valor + 1);
    }
  }

  protected confirmar(): void {
    if (this.formulario.invalid) {
      this.formulario.markAllAsTouched();
      return;
    }
    this.guardando();
  }

  private guardando(): void {
    const horaInicio = this.c.horaInicio.value;
    const [h = '9', m = '0'] = horaInicio.split(':');
    const fin = new Date(2000, 0, 1, Number(h), Number(m) + 30);

    this.citas
      .crear({
        pacienteId: this.c.pacienteId.value ?? 0,
        oftalmologoId: this.c.oftalmologoId.value ?? 0,
        fecha: this.c.fecha.value,
        horaInicio,
        horaFin: `${String(fin.getHours()).padStart(2, '0')}:${String(fin.getMinutes()).padStart(2, '0')}`,
        tipoConsulta: this.c.tipoConsulta.value || 'Consulta General',
        motivo: this.c.motivo.value,
        notas: '',
      })
      .subscribe({
        next: () => this.router.navigate(['/citas/confirmacion']),
        error: () => {
          this.error.set('El horario ya no está disponible. Elija otra franja.');
        },
      });
  }

  private aIso(fecha: Date): string {
    const mes = String(fecha.getMonth() + 1).padStart(2, '0');
    const dia = String(fecha.getDate()).padStart(2, '0');
    return `${fecha.getFullYear()}-${mes}-${dia}`;
  }
}