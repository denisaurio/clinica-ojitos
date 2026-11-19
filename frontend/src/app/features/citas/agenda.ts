import { ChangeDetectionStrategy, Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';

import { ButtonComponent } from '../../shared/components/ui-button';
import { SelectComponent, OpcionSelect } from '../../shared/components/ui-select';
import { CitaService } from '../../core/services/cita.service';
import { OftalmologoService } from '../../core/services/oftalmologo.service';
import { ContextoPaginaService } from '../../core/services/contexto-pagina.service';
import { EventoAgenda, BloqueHorario, DiaSemana } from '../../core/models';
import { IconComponent } from '../../shared/components/ui-icon';

interface DiaAgenda {
  fecha: string;
  etiqueta: string;
  numero: number;
  eventos: EventoEnCarril[];
  /** Pausas (bloques DESCANSO) del médico elegido para ese día. */
  descansos: { horaInicio: string; horaFin: string }[];
}

/** Evento con su carril: las citas que se cruzan se muestran lado a lado. */
interface EventoEnCarril extends EventoAgenda {
  carril: number;
  carriles: number;
}

const HORA_INICIO = 8;
const HORA_FIN = 18;
const ALTO_HORA = 64;

/**
 * Agenda semanal (imagen 30): una columna por día, franjas de una hora y bloques
 * de cita posicionados por hora de inicio y duración.
 */
@Component({
  selector: 'app-cita-agenda',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, ButtonComponent, SelectComponent, IconComponent],
  templateUrl: './agenda.html',
  styleUrl: './agenda.scss',
})
export class CitaAgendaComponent implements OnInit, OnDestroy {
  private readonly citas = inject(CitaService);
  private readonly oftalmologos = inject(OftalmologoService);
  private readonly contexto = inject(ContextoPaginaService);
  private readonly ruta = inject(ActivatedRoute);

  protected readonly medicos = signal<OpcionSelect[]>([]);
  protected readonly medicoSeleccionado = signal<number | null>(null);
  protected readonly descansos = signal<BloqueHorario[]>([]);
  protected readonly eventos = signal<EventoAgenda[]>([]);

  protected readonly horas = Array.from(
    { length: HORA_FIN - HORA_INICIO },
    (_, i) => HORA_INICIO + i
  );

  protected readonly altoHora = ALTO_HORA;

  /** Semana en curso: de lunes a viernes, sin fechas fijas de demostración. */
  protected readonly lunes = signal(this.inicioDeSemana(new Date()));
  private readonly viernes = computed(() => this.sumarDias(this.lunes(), 4));

  /** `true` si la semana mostrada es la actual (deshabilita «Hoy»). */
  protected readonly esSemanaActual = computed(
    () => this.aIso(this.lunes()) === this.aIso(this.inicioDeSemana(new Date()))
  );

  protected cambiarSemana(desplazamiento: number): void {
    this.lunes.update((l) => this.sumarDias(l, desplazamiento * 7));
    this.cargar();
  }

  protected irAHoy(): void {
    this.lunes.set(this.inicioDeSemana(new Date()));
    this.cargar();
  }

  ngOnInit(): void {
    this.contexto.configurar({ placeholder: '' });

    // ?semana=AAAA-MM-DD: al volver del modal se abre la semana de esa cita.
    const semana = this.ruta.snapshot.queryParamMap.get('semana');
    if (semana && /^\d{4}-\d{2}-\d{2}$/.test(semana)) {
      this.lunes.set(this.inicioDeSemana(new Date(`${semana}T00:00:00`)));
    }

    this.oftalmologos.listar('', true).subscribe((items) => {
      this.medicos.set(
        items.map((o) => ({ valor: o.id, etiqueta: o.nombreCompleto }))
      );
    });

    this.cargar();
  }

  ngOnDestroy(): void {
    this.contexto.restablecer();
  }

  protected cargar(): void {
    this.citas
      .agenda(
        this.medicoSeleccionado() ?? undefined,
        this.aIso(this.lunes()),
        this.aIso(this.viernes())
      )
      .subscribe((eventos) => this.eventos.set(eventos));
  }

  protected cambiarMedico(valor: string): void {
    const id = valor ? Number(valor) : null;
    this.medicoSeleccionado.set(id);
    this.cargar();
    // Las pausas salen del horario real del médico (sustituye a la «Pausa para
    // Almuerzo» fija que se pintaba solo los miércoles).
    this.descansos.set([]);
    if (id) {
      this.oftalmologos.horarios(id).subscribe({
        next: (horario) => this.descansos.set(horario.bloques.filter((b) => b.tipo === 'DESCANSO')),
        error: () => this.descansos.set([]),
      });
    }
  }

  protected readonly rangoFechas = computed(() => {
    const inicio = this.lunes();
    const fin = this.viernes();
    const mesInicio = inicio.toLocaleDateString('es-ES', { month: 'short' }).replace('.', '');
    const mesFin = fin.toLocaleDateString('es-ES', { month: 'short' }).replace('.', '');
    const anio = fin.getFullYear();
    return mesInicio === mesFin
      ? `${inicio.getDate()} – ${fin.getDate()} ${mesFin} ${anio}`
      : `${inicio.getDate()} ${mesInicio} – ${fin.getDate()} ${mesFin} ${anio}`;
  });

  protected readonly dias = computed<DiaAgenda[]>(() => {
    const etiquetas = ['LUN', 'MAR', 'MIÉ', 'JUE', 'VIE'];
    const codigos: DiaSemana[] = ['LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES'];
    return etiquetas.map((etiqueta, indice) => {
      const fecha = this.sumarDias(this.lunes(), indice);
      const iso = this.aIso(fecha);
      return {
        fecha: iso,
        etiqueta,
        numero: fecha.getDate(),
        eventos: this.enCarriles(this.eventos().filter((e) => e.fecha === iso)),
        descansos: this.descansos()
          .filter((b) => b.dia === codigos[indice])
          .map((b) => ({ horaInicio: b.horaInicio, horaFin: b.horaFin })),
      };
    });
  });

  /**
   * Reparte en carriles las citas que se solapan (p. ej. dos médicos a la misma
   * hora) para que no se dibujen una encima de otra.
   */
  private enCarriles(eventos: EventoAgenda[]): EventoEnCarril[] {
    const orden = [...eventos].sort((a, b) => a.horaInicio.localeCompare(b.horaInicio));
    const resultado: EventoEnCarril[] = [];
    let grupo: EventoEnCarril[] = [];
    let finesPorCarril: string[] = [];
    let finGrupo = '';

    const cerrarGrupo = () => {
      const total = finesPorCarril.length || 1;
      grupo.forEach((e) => (e.carriles = total));
      grupo = [];
      finesPorCarril = [];
      finGrupo = '';
    };

    for (const evento of orden) {
      if (grupo.length && evento.horaInicio >= finGrupo) cerrarGrupo();
      let carril = finesPorCarril.findIndex((fin) => fin <= evento.horaInicio);
      if (carril === -1) {
        carril = finesPorCarril.length;
        finesPorCarril.push(evento.horaFin);
      } else {
        finesPorCarril[carril] = evento.horaFin;
      }
      const conCarril: EventoEnCarril = { ...evento, carril, carriles: 1 };
      grupo.push(conCarril);
      resultado.push(conCarril);
      if (evento.horaFin > finGrupo) finGrupo = evento.horaFin;
    }
    cerrarGrupo();
    return resultado;
  }

  protected izquierda(evento: EventoEnCarril): string {
    return `calc(${(evento.carril * 100) / evento.carriles}% + 3px)`;
  }

  protected ancho(evento: EventoEnCarril): string {
    return `calc(${100 / evento.carriles}% - 6px)`;
  }

  /** Texto completo para el tooltip del bloque. */
  protected resumen(evento: EventoAgenda): string {
    return [
      `${evento.horaInicio}–${evento.horaFin}`,
      evento.titulo,
      evento.detalle,
      evento.oftalmologoNombre,
    ]
      .filter(Boolean)
      .join(' · ');
  }

  /** Etiqueta de hora en formato 12 h: 8 AM, 12 PM, 5 PM… */
  protected etiquetaHora(hora: number): string {
    const meridiano = hora < 12 ? 'AM' : 'PM';
    const displayed = hora % 12 === 0 ? 12 : hora % 12;
    return `${displayed} ${meridiano}`;
  }

  /**
   * Desplazamiento vertical del bloque en píxeles y altura según la duración.
   * Los eventos empiezan en la hora indicada por el backend.
   */
  protected desplazamiento(evento: EventoAgenda): number {
    const inicio = this.aHora(evento.horaInicio);
    const fin = this.aHora(evento.horaFin);
    return (inicio - HORA_INICIO) * ALTO_HORA;
  }

  protected desplazamientoHora(hora: string): number {
    return (this.aHora(hora) - HORA_INICIO) * ALTO_HORA;
  }

  protected alturaRango(inicio: string, fin: string): number {
    return Math.max((this.aHora(fin) - this.aHora(inicio)) * ALTO_HORA - 4, 20);
  }

  protected altura(evento: EventoAgenda): number {
    const duracion = this.aHora(evento.horaFin) - this.aHora(evento.horaInicio);
    return Math.max(duracion * ALTO_HORA - 4, 26);
  }

  protected esMedio(evento: EventoAgenda): boolean {
    return this.desplazamiento(evento) + this.altura(evento) / 2 > 12 * ALTO_HORA &&
      this.desplazamiento(evento) < 13 * ALTO_HORA;
  }

  protected cancelar(evento: EventoAgenda): void {
    this.citas.cancelar(evento.id, 'Cancelada desde la agenda').subscribe(() => this.cargar());
  }

  private inicioDeSemana(fecha: Date): Date {
    const copia = new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate());
    const desplazamiento = (copia.getDay() + 6) % 7;
    copia.setDate(copia.getDate() - desplazamiento);
    return copia;
  }

  private sumarDias(fecha: Date, dias: number): Date {
    const copia = new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate());
    copia.setDate(copia.getDate() + dias);
    return copia;
  }

  private aIso(fecha: Date): string {
    const mes = String(fecha.getMonth() + 1).padStart(2, '0');
    const dia = String(fecha.getDate()).padStart(2, '0');
    return `${fecha.getFullYear()}-${mes}-${dia}`;
  }

  private aHora(hora: string): number {
    const [h, m] = hora.split(':').map(Number);
    return (h ?? HORA_INICIO) + ((m ?? 0) / 60);
  }
}
