import { ChangeDetectionStrategy, Component, OnDestroy, OnInit, computed, inject, input, signal } from '@angular/core';

import { ButtonComponent } from '../../shared/components/ui-button';
import { BadgeComponent } from '../../shared/components/ui-badge';
import { AvatarComponent } from '../../shared/components/ui-avatar';
import { IconComponent } from '../../shared/components/ui-icon';
import { PaginationComponent } from '../../shared/components/ui-pagination';
import { SkeletonComponent } from '../../shared/components/ui-skeleton';
import { PacienteService } from '../../core/services/paciente.service';
import { HistorialService } from '../../core/services/historial.service';
import { ContextoPaginaService } from '../../core/services/contexto-pagina.service';
import { AuthService } from '../../core/services/auth.service';
import { OftalmologoService } from '../../core/services/oftalmologo.service';
import { AlertComponent } from '../../shared/components/ui-alert';
import { Consulta, PageResponse, Paciente } from '../../core/models';

/**
 * Historial de consultas en línea de tiempo (imagen 28).
 *
 * La última tarjeta está marcada como `ÚLTIMA` y la tercera se dibuja como
 * esqueleto de carga, tal y como documenta el prototipo.
 */
@Component({
  selector: 'app-historial-timeline',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ButtonComponent,
    BadgeComponent,
    AvatarComponent,
    IconComponent,
    PaginationComponent,
    SkeletonComponent,
    AlertComponent,
  ],
  templateUrl: './timeline.html',
  styleUrl: './timeline.scss',
})
export class HistorialTimelineComponent implements OnInit, OnDestroy {
  private readonly pacientes = inject(PacienteService);
  private readonly historial = inject(HistorialService);
  private readonly contexto = inject(ContextoPaginaService);
  private readonly auth = inject(AuthService);
  private readonly oftalmologos = inject(OftalmologoService);

  readonly id = input.required<string>();

  /** Ficha del médico con sesión iniciada: solo él firma sus consultas. */
  private readonly miOftalmologoId = signal<number | null>(null);
  protected readonly esMedico = computed(() => this.auth.rol() === 'OFTALMOLOGO');
  protected readonly puedeProgramarCirugia = computed(
    () => this.auth.rol() === 'OFTALMOLOGO' || this.auth.rol() === 'ADMINISTRADOR'
  );
  protected readonly cargando = signal(true);
  protected readonly abierta = signal<number | null>(null);
  protected readonly firmando = signal<number | null>(null);
  protected readonly aviso = signal<{ tipo: 'success' | 'danger'; texto: string } | null>(null);

  protected readonly paciente = signal<Paciente | null>(null);
  protected readonly pagina = signal(0);
  protected readonly tamanoPagina = 10;
  protected readonly resultado = signal<PageResponse<Consulta> | null>(null);

  ngOnInit(): void {
    this.contexto.configurar({ placeholder: '' });

    const id = Number(this.id());
    this.pacientes.obtener(id).subscribe((paciente) => this.paciente.set(paciente));
    this.cargar();
    if (this.esMedico()) {
      this.oftalmologos.yo().subscribe({ next: (m) => this.miOftalmologoId.set(m.id), error: () => undefined });
    }
  }

  protected puedeFirmar(consulta: Consulta): boolean {
    return !consulta.firmadaEn && this.miOftalmologoId() !== null
      && consulta.oftalmologoId === this.miOftalmologoId();
  }

  protected alternarInforme(id: number): void {
    this.abierta.update((actual) => (actual === id ? null : id));
  }

  protected imprimir(id: number): void {
    this.abierta.set(id);
    setTimeout(() => window.print(), 50);
  }

  protected firmar(consulta: Consulta): void {
    this.firmando.set(consulta.id);
    this.aviso.set(null);
    this.historial.firmar(consulta.id).subscribe({
      next: (firmada) => {
        this.firmando.set(null);
        this.resultado.update((r) =>
          r
            ? { ...r, content: r.content.map((c) => (c.id === firmada.id ? { ...c, firmadaEn: firmada.firmadaEn, firmadaPor: firmada.firmadaPor } : c)) }
            : r
        );
        this.aviso.set({ tipo: 'success', texto: 'Consulta firmada. Ya puede vincularse a una cirugía.' });
      },
      error: (fallo) => {
        this.firmando.set(null);
        this.aviso.set({ tipo: 'danger', texto: fallo?.error?.message || 'No se pudo firmar la consulta.' });
      },
    });
  }

  ngOnDestroy(): void {
    this.contexto.restablecer();
  }

  protected cargar(): void {
    this.cargando.set(true);
    this.historial.listar(Number(this.id()), this.pagina(), this.tamanoPagina).subscribe({
      next: (respuesta) => {
        this.resultado.set(respuesta);
        this.cargando.set(false);
      },
      error: () => this.cargando.set(false),
    });
  }

  protected cambiarPagina(pagina: number): void {
    this.pagina.set(pagina);
    this.cargar();
  }

  protected iniciales(nombre: string): string {
    return nombre
      .replace(/^(Dr\.|Dra\.)\s*/i, '')
      .split(/\s+/)
      .slice(0, 2)
      .map((p) => p.charAt(0).toUpperCase())
      .join('');
  }

  protected sango(nombre: string): string {
    const partes = nombre.replace(/^(Dr\.|Dra\.)\s*/i, '').split(/\s+/);
    return (partes[partes.length - 1] ?? '').charAt(0).toUpperCase();
  }

  /** Imprime la consulta en el formato `dd/mm/aaaa` a partir de la fecha ISO. */
  protected fechaIso(consulta: Consulta): string {
    const bruto = consulta.fecha.match(/\d{4}-\d{2}-\d{2}/);
    if (!bruto) {
      return consulta.fecha;
    }
    const [anio, mes, dia] = bruto[0].split('-');
    return `${dia}/${mes}/${anio}`;
  }
}