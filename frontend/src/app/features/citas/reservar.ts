import { ChangeDetectionStrategy, Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';

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
import { CatalogoService } from '../../core/services/catalogo.service';
import { AuthService } from '../../core/services/auth.service';
import { DashboardService } from '../../core/services/dashboard.service';
import { ContextoPaginaService } from '../../core/services/contexto-pagina.service';
import { SlotDisponibilidad } from '../../core/models';

interface DiaCalendario {
  iso: string;
  numero: number;
  delMes: boolean;
  seleccionado: boolean;
  /** Días anteriores a hoy: el backend no acepta citas en el pasado. */
  pasado: boolean;
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
  private readonly catalogos = inject(CatalogoService);
  private readonly auth = inject(AuthService);
  private readonly dashboard = inject(DashboardService);

  /** RF3.1 — el paciente reserva para sí mismo: su ficha va fija. */
  protected readonly esPaciente = this.auth.esPaciente;
  private readonly router = inject(Router);
  private readonly contexto = inject(ContextoPaginaService);

  protected readonly paso = signal(1);
  protected readonly medicos = signal<OpcionSelect[]>([]);
  protected readonly pacientesOpciones = signal<OpcionSelect[]>([]);
  protected readonly tiposConsulta = signal<OpcionSelect[]>([]);
  protected readonly slots = signal<SlotDisponibilidad[]>([]);
  protected readonly slotSeleccionado = signal<string>('');

  /**
   * Fecha elegida como estado reactivo. Antes el calendario leía el valor del
   * formulario (no reactivo) y el día marcado no cambiaba al hacer clic.
   */
  protected readonly fechaSeleccionada = signal(this.hoyIso());

  /** «24 de noviembre de 2026», sin depender de datos de idioma registrados. */
  protected readonly fechaLegible = computed(() => {
    const [a, m, d] = this.fechaSeleccionada().split('-').map(Number);
    const meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
    return a && m && d ? `${d} de ${meses.at(m - 1)} de ${a}` : '';
  });
  protected readonly cargando = signal(false);
  protected readonly error = signal('');

  /** El calendario arranca en el mes real, no en una fecha del prototipo. */
  protected readonly mes = signal(new Date(new Date().getFullYear(), new Date().getMonth(), 1));

  protected readonly formulario = this.fb.nonNullable.group({
    oftalmologoId: [null as number | null, [Validators.required]],
    pacienteId: [null as number | null, [Validators.required]],
    fecha: [this.hoyIso(), [Validators.required]],
    horaInicio: ['', [Validators.required]],
    tipoConsultaId: [null as number | null, [Validators.required]],
    motivo: [''],
    notaInterna: [''],
  });

  ngOnInit(): void {
    this.contexto.configurar({ placeholder: '' });

    // /oftalmologos/activos sirve a todos los roles (el directorio paginado no
    // está permitido al paciente).
    this.oftalmologos.activos().subscribe((items) => {
      this.medicos.set(items.map((o) => ({ valor: o.id, etiqueta: o.nombreCompleto })));
    });

    if (this.esPaciente()) {
      this.dashboard.paciente().subscribe({
        next: (portal) => {
          if (portal.pacienteId) {
            this.pacientesOpciones.set([{ valor: portal.pacienteId, etiqueta: portal.nombre }]);
            this.formulario.controls.pacienteId.setValue(portal.pacienteId);
          } else {
            this.error.set(
              'Su cuenta no está vinculada a una ficha de paciente. Comuníquese con recepción.'
            );
          }
        },
        error: () => this.error.set('No se encontró su ficha de paciente. Comuníquese con recepción.'),
      });
    } else {
      this.pacientes.listar('', 0, 100).subscribe((pagina) => {
        this.pacientesOpciones.set(
          pagina.content.map((p) => ({ valor: p.id, etiqueta: p.nombreCompleto }))
        );
      });
    }

    this.catalogos.tiposConsulta().subscribe((items) => {
      this.tiposConsulta.set(items.map((t) => ({ valor: t.id, etiqueta: t.nombre })));
    });
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
        seleccionado: iso === this.fechaSeleccionada(),
        pasado: iso < this.hoyIso(),
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
    if (!dia.delMes || dia.pasado) {
      return;
    }
    this.c.fecha.setValue(dia.iso);
    this.fechaSeleccionada.set(dia.iso);
    this.c.horaInicio.setValue('');
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
    const medico = this.c.oftalmologoId.value;
    if (!medico) {
      this.slots.set([]);
      return;
    }
    this.cargando.set(true);
    this.citas.disponibilidad(Number(medico), fecha || this.hoyIso()).subscribe((slots) => {
      this.slots.set(slots);
      this.cargando.set(false);
    });
  }

  /** Al elegir especialista se recargan las franjas de la fecha ya seleccionada. */
  protected cambiarMedico(valor: string): void {
    this.c.oftalmologoId.setValue(valor ? Number(valor) : null);
    this.slotSeleccionado.set('');
    this.c.horaInicio.setValue('');
    this.cargarDisponibilidad(this.c.fecha.value);
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
    const id = Number(this.c.oftalmologoId.value);
    return this.medicos().find((m) => Number(m.valor) === id)?.etiqueta ?? '—';
  }

  protected nombrePaciente(): string {
    const id = Number(this.c.pacienteId.value);
    return this.pacientesOpciones().find((p) => Number(p.valor) === id)?.etiqueta ?? '—';
  }

  protected seleccionada(hora: string): boolean {
    return this.slotSeleccionado() === hora;
  }

  /* ------------------------------------------------------- Navegación */

  /** Qué falta en un paso; vacío = se puede avanzar. */
  private faltanteDelPaso(paso: number): string {
    if (paso === 1) {
      if (this.c.oftalmologoId.value === null) return 'Elija un especialista.';
      if (!this.c.horaInicio.value) return 'Elija un horario disponible.';
    }
    if (paso === 2) {
      if (this.c.pacienteId.value === null) {
        return this.esPaciente()
          ? 'Su cuenta no está vinculada a una ficha de paciente. Comuníquese con recepción.'
          : 'Seleccione el paciente.';
      }
      if (this.c.tipoConsultaId.value === null) return 'Seleccione el tipo de consulta.';
    }
    return '';
  }

  protected siguiente(): void {
    // Antes el paso 2 dejaba avanzar sin tipo de consulta y en el paso 3
    // "Confirmar Cita" no hacía nada, sin decir por qué.
    const falta = this.faltanteDelPaso(this.paso());
    if (falta) {
      this.formulario.markAllAsTouched();
      this.error.set(falta);
      return;
    }
    this.error.set('');
    if (this.paso() < 3) {
      this.paso.update((valor) => valor + 1);
    }
  }

  protected confirmar(): void {
    for (const paso of [1, 2]) {
      const falta = this.faltanteDelPaso(paso);
      if (falta) {
        this.error.set(falta);
        this.paso.set(paso);
        this.formulario.markAllAsTouched();
        return;
      }
    }
    if (this.formulario.invalid) {
      this.formulario.markAllAsTouched();
      this.error.set('Revise los datos de la cita.');
      return;
    }
    this.error.set('');
    this.guardando();
  }

  protected nombreTipo(): string {
    const id = Number(this.c.tipoConsultaId.value);
    return this.tiposConsulta().find((t) => Number(t.valor) === id)?.etiqueta ?? '—';
  }

  private guardando(): void {
    const horaInicio = this.c.horaInicio.value;
    const [h = '9', m = '0'] = horaInicio.split(':');
    const fin = new Date(2000, 0, 1, Number(h), Number(m) + 30);

    this.citas
      .crear({
        pacienteId: Number(this.c.pacienteId.value),
        oftalmologoId: Number(this.c.oftalmologoId.value),
        fecha: this.c.fecha.value,
        horaInicio,
        horaFin: `${String(fin.getHours()).padStart(2, '0')}:${String(fin.getMinutes()).padStart(2, '0')}`,
        tipoConsultaId: Number(this.c.tipoConsultaId.value),
        motivo: this.c.motivo.value,
        notaInterna: this.c.notaInterna.value,
      })
      .subscribe({
        next: () => this.router.navigate(['/citas/confirmacion']),
        error: (fallo: { status?: number; error?: { message?: string } }) => {
          // Antes cualquier error se mostraba como "horario no disponible".
          this.error.set(
            fallo?.status === 409
              ? 'El horario ya no está disponible. Elija otra franja.'
              : fallo?.error?.message || 'No se pudo reservar la cita. Inténtelo de nuevo.'
          );
        },
      });
  }

  private aIso(fecha: Date): string {
    const mes = String(fecha.getMonth() + 1).padStart(2, '0');
    const dia = String(fecha.getDate()).padStart(2, '0');
    return `${fecha.getFullYear()}-${mes}-${dia}`;
  }

  private hoyIso(): string {
    return this.aIso(new Date());
  }
}