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

import { ButtonComponent } from '../../shared/components/ui-button';
import { SelectComponent, OpcionSelect } from '../../shared/components/ui-select';
import { CardComponent } from '../../shared/components/ui-card';
import { OftalmologoService } from '../../core/services/oftalmologo.service';
import { ContextoPaginaService } from '../../core/services/contexto-pagina.service';
import { BloqueHorario, DiaSemana } from '../../core/models';
import { IconComponent } from '../../shared/components/ui-icon';

const DIAS: DiaSemana[] = ['LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES'];
const HORAS: string[] = [
  '8:00 AM', '9:00 AM', '10:00 AM', '11:00 AM',
  '12:00 PM', '1:00 PM', '2:00 PM', '3:00 PM',
];

/**
 * Matriz de disponibilidad semanal (imagen 40).
 *
 * Arrastrar y soltar con la API nativa de HTML5 (sin dependencias): al soltar
 * sobre una celda se pinta la franja completa de consulta de ese médico. El
 * guardado va a `PUT /oftalmologos/{id}/horarios`.
 */
@Component({
  selector: 'app-oftalmologo-horarios',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ButtonComponent, SelectComponent, CardComponent, IconComponent],
  templateUrl: './horarios.html',
  styleUrl: './horarios.scss',
})
export class OftalmologoHorariosComponent implements OnInit, OnDestroy {
  private readonly oftalmologos = inject(OftalmologoService);
  private readonly contexto = inject(ContextoPaginaService);

  /** Ruta `oftalmologos/horarios/:id`. */
  readonly id = input.required<string>();

  protected readonly medicoNombre = signal('Dra. Sarah Jenkins');
  protected readonly bloques = signal<BloqueHorario[]>([]);
  protected readonly arrastreActivo = signal(false);
  protected readonly guardando = signal(false);
  protected readonly sedes: OpcionSelect[] = [
    { valor: 'Clínica Principal (Centre)', etiqueta: 'Clínica Principal (Centre)' },
    { valor: 'Clínica Norte', etiqueta: 'Clínica Norte' },
  ];

  protected readonly dias = DIAS;
  protected readonly horas = HORAS;

  ngOnInit(): void {
    this.contexto.configurar({
      placeholder: 'Buscar...',
      antetitulo: '',
      textoEnlace: 'Soporte',
      accion: { texto: 'Nuevo Registro', destino: '/oftalmologos/nuevo', variante: 'primario' },
    });

    this.oftalmologos.obtener(Number(this.id())).subscribe((m) => this.medicoNombre.set(m.nombreCompleto));
    this.oftalmologos.horarios(Number(this.id())).subscribe((h) => this.bloques.set(h.bloques));
  }

  ngOnDestroy(): void {
    this.contexto.restablecer();
  }

  /** Hora de la fila en formato 24 h, para comparar con los bloques. */
  protected horaDe24(indice: number): string {
    return String(indiceDe8(indice)).padStart(2, '0') + ':00';
  }

  /** Porcentaje acotado al 100 % para las barras del resumen. */
  protected acotar(valor: number): number {
    return Math.max(0, Math.min(100, valor));
  }

  /** `true` si el día tiene un bloque de consulta que cubre esta franja. */
  protected disponible(dia: DiaSemana, indiceHora: number): boolean {
    const hora = this.horaDe24(indiceHora);
    return this.bloques().some(
      (b) => b.dia === dia && b.tipo === 'DISPONIBLE' && hora >= b.horaInicio && hora < b.horaFin
    );
  }

  protected quirurgico(dia: DiaSemana, indiceHora: number): boolean {
    const hora = this.horaDe24(indiceHora);
    return this.bloques().some(
      (b) => b.dia === dia && b.tipo === 'QUIRURGICO' && hora >= b.horaInicio && hora < b.horaFin
    );
  }

  protected alternar(dia: DiaSemana, indiceHora: number): void {
    if (this.disponible(dia, indiceHora)) {
      // Quita la franja completa de esa hora en ese día.
      const hora = this.horaDe24(indiceHora);
      this.bloques.update((bloques) => bloques.filter((b) => !(b.dia === dia && b.horaInicio === hora)));
      return;
    }
    this.bloques.update((bloques) => [
      ...bloques,
      { dia, horaInicio: this.horaDe24(indiceHora), horaFin: this.horaDe24(indiceHora + 1), tipo: 'DISPONIBLE' },
    ]);
  }

  /* ------------------------------------------------------ Arrastrar */

  protected alArrastrarInicio(): void {
    this.arrastreActivo.set(true);
  }

  protected alArrastrarFin(): void {
    this.arrastreActivo.set(false);
  }

  protected alSoltar(dia: DiaSemana, indiceHora: number): void {
    this.arrastreActivo.set(false);
    if (!this.disponible(dia, indiceHora)) {
      this.alternar(dia, indiceHora);
    }
  }

  /* --------------------------------------------------------- Resumen */

  protected readonly totalHoras = computed(() =>
    this.bloques()
      .filter((b) => b.tipo === 'DISPONIBLE')
      .reduce((suma, b) => suma + horasEntre(b.horaInicio, b.horaFin), 0)
  );

  protected readonly horasQuirurgicas = computed(() =>
    this.bloques()
      .filter((b) => b.tipo === 'QUIRURGICO')
      .reduce((suma, b) => suma + horasEntre(b.horaInicio, b.horaFin), 0)
  );

  protected guardar(): void {
    this.guardando.set(true);
    this.oftalmologos.guardarHorarios(Number(this.id()), this.bloques()).subscribe(() => {
      this.guardando.set(false);
    });
  }
}

function indiceDe8(indice: number): number {
  return 8 + indice;
}

function horasEntre(inicio: string, fin: string): number {
  const [hi = 8, mi = 0] = inicio.split(':').map(Number);
  const [hf = 8, mf = 0] = fin.split(':').map(Number);
  return hf - hi + (mf - mi) / 60;
}
