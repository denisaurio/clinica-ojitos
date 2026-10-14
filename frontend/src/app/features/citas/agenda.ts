import { ChangeDetectionStrategy, Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { ButtonComponent } from '../../shared/components/ui-button';
import { SelectComponent, OpcionSelect } from '../../shared/components/ui-select';
import { CitaService } from '../../core/services/cita.service';
import { OftalmologoService } from '../../core/services/oftalmologo.service';
import { ContextoPaginaService } from '../../core/services/contexto-pagina.service';
import { EventoAgenda } from '../../core/models';
import { IconComponent } from '../../shared/components/ui-icon';

interface DiaAgenda {
  fecha: string;
  etiqueta: string;
  numero: number;
  eventos: EventoAgenda[];
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

  protected readonly medicos = signal<OpcionSelect[]>([]);
  protected readonly medicoSeleccionado = signal<number | null>(1);
  protected readonly eventos = signal<EventoAgenda[]>([]);

  protected readonly horas = Array.from(
    { length: HORA_FIN - HORA_INICIO },
    (_, i) => HORA_INICIO + i
  );

  protected readonly altoHora = ALTO_HORA;

  /** Lunes 19 – viernes 23 de octubre de 2026, la semana que muestra el prototipo. */
  private readonly semanaInicio = '2026-10-19';
  private readonly semanaFin = '2026-10-23';

  ngOnInit(): void {
    this.contexto.configurar({ placeholder: '' });

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
      .agenda(this.medicoSeleccionado() ?? undefined, this.semanaInicio, this.semanaFin)
      .subscribe((eventos) => this.eventos.set(eventos));
  }

  protected cambiarMedico(valor: string): void {
    this.medicoSeleccionado.set(Number(valor));
    this.cargar();
  }

  protected readonly rangoFechas = computed(() => {
    const inicio = new Date(`${this.semanaInicio}T00:00:00`);
    const fin = new Date(`${this.semanaFin}T00:00:00`);
    return `${inicio.getDate()} oct – ${fin.getDate()} oct ${fin.getFullYear()}`;
  });

  protected readonly dias = computed<DiaAgenda[]>(() => {
    const etiquetas = ['LUN', 'MAR', 'MIÉ', 'JUE', 'VIE'];
    return etiquetas.map((etiqueta, indice) => {
      const fecha = new Date(`${this.semanaInicio}T00:00:00`);
      fecha.setDate(fecha.getDate() + indice);
      const iso = this.aIso(fecha);
      return {
        fecha: iso,
        etiqueta,
        numero: fecha.getDate(),
        eventos: this.eventos().filter((e) => e.fecha === iso),
      };
    });
  });

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

  protected altura(evento: EventoAgenda): number {
    const duracion = this.aHora(evento.horaFin) - this.aHora(evento.horaInicio);
    return Math.max(duracion * ALTO_HORA - 6, 28);
  }

  protected esMedio(evento: EventoAgenda): boolean {
    return this.desplazamiento(evento) + this.altura(evento) / 2 > 12 * ALTO_HORA &&
      this.desplazamiento(evento) < 13 * ALTO_HORA;
  }

  protected cancelar(evento: EventoAgenda): void {
    this.citas.cancelar(evento.id, 'Cancelada desde la agenda').subscribe(() => this.cargar());
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
