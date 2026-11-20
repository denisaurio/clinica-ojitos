import {
  ChangeDetectionStrategy,
  Component,
  HostListener,
  OnDestroy,
  OnInit,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';

import { ButtonComponent } from '../../shared/components/ui-button';
import { CardComponent } from '../../shared/components/ui-card';
import { AlertComponent } from '../../shared/components/ui-alert';
import { OftalmologoService } from '../../core/services/oftalmologo.service';
import { ContextoPaginaService } from '../../core/services/contexto-pagina.service';
import { AuthService } from '../../core/services/auth.service';
import { BloqueHorario, DiaSemana } from '../../core/models';

type TipoCelda = 'DISPONIBLE' | 'QUIRURGICO';

const DIAS: { codigo: DiaSemana; nombre: string }[] = [
  { codigo: 'LUNES', nombre: 'Lunes' },
  { codigo: 'MARTES', nombre: 'Martes' },
  { codigo: 'MIERCOLES', nombre: 'Miércoles' },
  { codigo: 'JUEVES', nombre: 'Jueves' },
  { codigo: 'VIERNES', nombre: 'Viernes' },
  { codigo: 'SABADO', nombre: 'Sábado' },
];

/** Filas de 07:00 a 19:00 (la última franja termina a las 20:00). */
const PRIMERA_HORA = 7;
const ULTIMA_HORA = 19;

/**
 * Horario semanal del médico (imagen 40).
 *
 * Cada celda es una hora. Se pinta haciendo clic o arrastrando con el ratón;
 * el modo elige si se pinta "Consulta" (lo que el paciente puede reservar) o
 * "Cirugía" (no reservable). Al guardar, las horas seguidas del mismo tipo se
 * unen en bloques y van a `PUT /oftalmologos/{id}/horarios`.
 *
 * - `oftalmologos/horarios/:id` → el administrador edita el de cualquier médico.
 * - `oftalmologos/mi-horario`   → el médico edita el suyo.
 */
@Component({
  selector: 'app-oftalmologo-horarios',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, ButtonComponent, CardComponent, AlertComponent],
  templateUrl: './horarios.html',
  styleUrl: './horarios.scss',
})
export class OftalmologoHorariosComponent implements OnInit, OnDestroy {
  private readonly oftalmologos = inject(OftalmologoService);
  private readonly contexto = inject(ContextoPaginaService);
  private readonly auth = inject(AuthService);

  /** Ruta `oftalmologos/horarios/:id`; vacío en `mi-horario`. */
  readonly id = input<string>();

  protected readonly esPropio = computed(() => !this.id());
  protected readonly medicoId = signal<number | null>(null);
  protected readonly medicoNombre = signal('');
  protected readonly cargando = signal(true);
  protected readonly guardando = signal(false);
  protected readonly aviso = signal<{ tipo: 'success' | 'danger'; texto: string } | null>(null);
  protected readonly modo = signal<TipoCelda>('DISPONIBLE');

  /** Celdas pintadas: clave `DIA|HH` → tipo. */
  protected readonly celdas = signal<Map<string, TipoCelda>>(new Map());
  /** Bloques de descanso que vinieron de la base: se conservan tal cual. */
  private descansos: BloqueHorario[] = [];

  protected readonly dias = DIAS;
  protected readonly horas = Array.from(
    { length: ULTIMA_HORA - PRIMERA_HORA + 1 },
    (_, i) => PRIMERA_HORA + i
  );

  /** Arrastre: pinta (o borra) mientras el botón del ratón está pulsado. */
  private pintando: 'pintar' | 'borrar' | null = null;

  ngOnInit(): void {
    this.contexto.configurar({ placeholder: '' });

    const id = this.id();
    if (id) {
      this.cargar(Number(id));
    } else {
      this.oftalmologos.yo().subscribe({
        next: (m) => this.cargar(m.id),
        error: () => {
          this.cargando.set(false);
          this.aviso.set({
            tipo: 'danger',
            texto: 'Su cuenta no está vinculada a una ficha de oftalmólogo. Contacte al administrador.',
          });
        },
      });
    }
  }

  ngOnDestroy(): void {
    this.contexto.restablecer();
  }

  private cargar(id: number): void {
    this.medicoId.set(id);
    this.oftalmologos.obtener(id).subscribe((m) => this.medicoNombre.set(m.nombreCompleto));
    this.oftalmologos.horarios(id).subscribe({
      next: (h) => {
        const mapa = new Map<string, TipoCelda>();
        this.descansos = [];
        for (const b of h.bloques) {
          if (b.tipo === 'DESCANSO') {
            this.descansos.push(b);
            continue;
          }
          const tipo: TipoCelda = b.tipo === 'QUIRURGICO' ? 'QUIRURGICO' : 'DISPONIBLE';
          const desde = Number(b.horaInicio.slice(0, 2));
          const [hf, mf] = b.horaFin.split(':').map(Number);
          const hasta = mf > 0 ? hf + 1 : hf;
          for (let hora = desde; hora < hasta; hora++) mapa.set(this.clave(b.dia, hora), tipo);
        }
        this.celdas.set(mapa);
        this.cargando.set(false);
      },
      error: () => {
        this.cargando.set(false);
        this.aviso.set({ tipo: 'danger', texto: 'No se pudo cargar el horario.' });
      },
    });
  }

  /* ------------------------------------------------------------ Celdas */

  private clave(dia: DiaSemana, hora: number): string {
    return `${dia}|${hora}`;
  }

  protected tipoDe(dia: DiaSemana, hora: number): TipoCelda | null {
    return this.celdas().get(this.clave(dia, hora)) ?? null;
  }

  protected etiquetaHora(hora: number): string {
    return `${String(hora).padStart(2, '0')}:00`;
  }

  private aplicar(dia: DiaSemana, hora: number): void {
    const mapa = new Map(this.celdas());
    if (this.pintando === 'borrar') mapa.delete(this.clave(dia, hora));
    else mapa.set(this.clave(dia, hora), this.modo());
    this.celdas.set(mapa);
    this.aviso.set(null);
  }

  protected alPresionar(dia: DiaSemana, hora: number, evento: PointerEvent): void {
    evento.preventDefault();
    // Si la celda ya tiene el tipo del modo, el arrastre borra; si no, pinta.
    this.pintando = this.tipoDe(dia, hora) === this.modo() ? 'borrar' : 'pintar';
    this.aplicar(dia, hora);
  }

  protected alEntrar(dia: DiaSemana, hora: number): void {
    if (this.pintando) this.aplicar(dia, hora);
  }

  @HostListener('window:pointerup')
  @HostListener('window:pointercancel')
  protected alSoltar(): void {
    this.pintando = null;
  }

  protected limpiarDia(dia: DiaSemana): void {
    const mapa = new Map(this.celdas());
    for (const hora of this.horas) mapa.delete(this.clave(dia, hora));
    this.celdas.set(mapa);
  }

  /* ----------------------------------------------------------- Resumen */

  private horasDe(tipo: TipoCelda): number {
    return [...this.celdas().values()].filter((t) => t === tipo).length;
  }

  protected readonly totalHoras = computed(() => this.horasDe('DISPONIBLE'));
  protected readonly horasQuirurgicas = computed(() => this.horasDe('QUIRURGICO'));

  /** Texto por día para el resumen, p. ej. "08:00–13:00, 15:00–18:00". */
  protected resumenDia(dia: DiaSemana): string {
    return (
      this.bloquesDe(dia)
        .filter((b) => b.tipo === 'DISPONIBLE')
        .map((b) => `${b.horaInicio}–${b.horaFin}`)
        .join(', ') || 'No atiende'
    );
  }

  protected acotar(valor: number): number {
    return Math.max(0, Math.min(100, valor));
  }

  /** Une las horas seguidas del mismo tipo en bloques. */
  private bloquesDe(dia: DiaSemana): BloqueHorario[] {
    const bloques: BloqueHorario[] = [];
    let actual: BloqueHorario | null = null;
    for (const hora of [...this.horas, ULTIMA_HORA + 1]) {
      const tipo = hora <= ULTIMA_HORA ? this.tipoDe(dia, hora) : null;
      if (actual && actual.tipo === tipo) {
        actual.horaFin = this.etiquetaHora(hora + 1);
        continue;
      }
      if (actual) bloques.push(actual);
      actual = tipo
        ? { dia, horaInicio: this.etiquetaHora(hora), horaFin: this.etiquetaHora(hora + 1), tipo }
        : null;
    }
    return bloques;
  }

  /* ------------------------------------------------------------ Guardar */

  protected guardar(): void {
    const id = this.medicoId();
    if (id === null) return;
    const bloques = [...this.dias.flatMap((d) => this.bloquesDe(d.codigo)), ...this.descansos];
    this.guardando.set(true);
    this.aviso.set(null);
    this.oftalmologos.guardarHorarios(id, bloques).subscribe({
      next: () => {
        this.guardando.set(false);
        this.aviso.set({
          tipo: 'success',
          texto: 'Horario guardado. Los pacientes ya ven estos turnos al reservar.',
        });
      },
      error: (fallo) => {
        this.guardando.set(false);
        this.aviso.set({
          tipo: 'danger',
          texto: fallo?.error?.message || fallo?.message || 'No se pudo guardar el horario.',
        });
      },
    });
  }

  protected readonly esAdmin = computed(() => this.auth.rol() === 'ADMINISTRADOR');
}
