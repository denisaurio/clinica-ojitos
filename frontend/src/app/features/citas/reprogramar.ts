import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';

import { ButtonComponent } from '../../shared/components/ui-button';
import { ModalComponent } from '../../shared/components/ui-modal';
import { IconComponent } from '../../shared/components/ui-icon';
import { CitaService } from '../../core/services/cita.service';
import { Cita, SlotDisponibilidad } from '../../core/models';

interface DiaMiniCalendario {
  iso: string;
  numero: number;
  delMes: boolean;
  seleccionado: boolean;
}

/**
 * Reprogramación de cita (imagen 31): cita actual, nueva fecha, calendario en
 * miniatura, franjas y confirmación de baja.
 *
 * RF3.2 — el cruce de horarios lo valida el backend; el frontend solo evita
 * ofrecer franjas ya ocupadas.
 */
@Component({
  selector: 'app-cita-reprogramar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    ButtonComponent,
    ModalComponent,
    IconComponent,
  ],
  templateUrl: './reprogramar.html',
  styleUrl: './reprogramar.scss',
})
export class CitaReprogramarComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly citas = inject(CitaService);

  /** Ruta `citas/reprogramar/:id`. */
  readonly id = input.required<string>();

  protected readonly cita = signal<Cita | null>(null);
  protected readonly slots = signal<SlotDisponibilidad[]>([]);
  protected readonly slotSeleccionado = signal<string>('');
  protected readonly confirmarCancelacion = signal(false);
  protected readonly guardando = signal(false);
  protected readonly error = signal('');

  protected readonly mes = signal(new Date(2024, 9, 1));

  protected readonly formulario = this.fb.nonNullable.group({
    fecha: ['2024-10-31', [Validators.required]],
    horaInicio: ['', [Validators.required]],
    notaInterna: [''],
  });

  ngOnInit(): void {
    this.citas.obtener(Number(this.id())).subscribe((cita) => {
      this.cita.set(cita);
      this.cargarDisponibilidad(this.formulario.controls.fecha.value);
    });
  }

  /* ------------------------------------------------------- Calendario */

  protected readonly tituloMes = computed(() => {
    const mes = this.mes();
    const nombre = mes.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
    return nombre.charAt(0).toUpperCase() + nombre.slice(1);
  });

  protected readonly calendario = computed<DiaMiniCalendario[]>(() => {
    const mes = this.mes();
    const primero = new Date(mes.getFullYear(), mes.getMonth(), 1);
    const desplazamiento = (primero.getDay() + 6) % 7;

    const celdas: DiaMiniCalendario[] = [];
    for (let i = 0; i < 42; i++) {
      const dia = new Date(primero);
      dia.setDate(dia.getDate() - desplazamiento + i);
      const iso = this.aIso(dia);
      celdas.push({
        iso,
        numero: dia.getDate(),
        delMes: dia.getMonth() === mes.getMonth(),
        seleccionado: iso === this.formulario.controls.fecha.value,
      });
    }
    return celdas;
  });

  protected diasSemana = ['LU', 'MA', 'MI', 'JU', 'VI', 'SÁ', 'DO'];

  protected mesAnterior(): void {
    this.mes.update((actual) => new Date(actual.getFullYear(), actual.getMonth() - 1, 1));
  }

  protected mesSiguiente(): void {
    this.mes.update((actual) => new Date(actual.getFullYear(), actual.getMonth() + 1, 1));
  }

  protected seleccionarDia(dia: DiaMiniCalendario): void {
    this.formulario.controls.fecha.setValue(dia.iso);
    this.slotSeleccionado.set('');
    this.formulario.controls.horaInicio.setValue('');
    this.cargarDisponibilidad(dia.iso);
  }

  protected cambiarFecha(fecha: string): void {
    this.formulario.controls.fecha.setValue(fecha);
    this.slotSeleccionado.set('');
    this.cargarDisponibilidad(fecha);
  }

  /* ---------------------------------------------------------- Franjas */

  protected cargarDisponibilidad(fecha: string): void {
    const cita = this.cita();
    this.citas
      .disponibilidad(cita?.oftalmologoId, fecha)
      .subscribe((slots) => this.slots.set(slots));
  }

  protected seleccionarSlot(slot: SlotDisponibilidad): void {
    if (slot.estado !== 'FREE') {
      return;
    }
    this.slotSeleccionado.set(slot.horaInicio);
    this.formulario.controls.horaInicio.setValue(slot.horaInicio);
  }

  /** Formato 12 h con sufijo: `09:00 AM`, tal como el prototipo. */
  protected horaLegible(hora: string): string {
    const [h = '9', m = '00'] = hora.split(':');
    const meridiano = Number(h) < 12 ? 'AM' : 'PM';
    const displayed = Number(h) % 12 === 0 ? 12 : Number(h) % 12;
    return `${String(displayed).padStart(2, '0')}:${m} ${meridiano}`;
  }

  protected seleccionada(hora: string): boolean {
    return this.slotSeleccionado() === hora;
  }

  /* ---------------------------------------------------------- Acciones */

  protected confirmar(): void {
    if (this.formulario.invalid) {
      this.formulario.markAllAsTouched();
      return;
    }

    const horaInicio = this.formulario.controls.horaInicio.value;
    const [h = '9', m = '0'] = horaInicio.split(':');
    const fin = new Date(2000, 0, 1, Number(h), Number(m) + 30);

    this.guardando.set(true);
    this.citas
      .reprogramar(Number(this.id()), {
        fecha: this.formulario.controls.fecha.value,
        horaInicio,
        horaFin: `${String(fin.getHours()).padStart(2, '0')}:${String(fin.getMinutes()).padStart(2, '0')}`,
        notaInterna: this.formulario.controls.notaInterna.value,
      })
      .subscribe({
        next: () => {
          this.guardando.set(false);
          this.slotSeleccionado.set('');
        },
        error: () => {
          this.guardando.set(false);
          this.error.set('El horario seleccionado ya no está disponible.');
        },
      });
  }

  protected confirmarBaja(): void {
    const cita = this.cita();
    if (!cita) {
      return;
    }
    this.citas.cancelar(cita.id, 'Cancelada a petición del paciente').subscribe(() => {
      this.confirmarCancelacion.set(false);
      this.cita.set({ ...cita, estadoCita: 'CANCELADA' });
    });
  }

  private aIso(fecha: Date): string {
    const mes = String(fecha.getMonth() + 1).padStart(2, '0');
    const dia = String(fecha.getDate()).padStart(2, '0');
    return `${fecha.getFullYear()}-${mes}-${dia}`;
  }
}