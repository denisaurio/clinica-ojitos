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
import { RouterLink } from '@angular/router';

import { ButtonComponent } from '../../shared/components/ui-button';
import { CardComponent } from '../../shared/components/ui-card';
import { BadgeComponent } from '../../shared/components/ui-badge';
import { AvatarComponent } from '../../shared/components/ui-avatar';
import { TableComponent } from '../../shared/components/ui-table';
import { SkeletonComponent } from '../../shared/components/ui-skeleton';
import { IconComponent } from '../../shared/components/ui-icon';
import { OftalmologoService } from '../../core/services/oftalmologo.service';
import { CitaService } from '../../core/services/cita.service';
import { ContextoPaginaService } from '../../core/services/contexto-pagina.service';
import { Cita, MetricasOftalmologo, Oftalmologo } from '../../core/models';

/** Ficha del médico vista por el administrador (imagen 41). */
@Component({
  selector: 'app-oftalmologo-perfil',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    ButtonComponent,
    CardComponent,
    BadgeComponent,
    AvatarComponent,
    TableComponent,
    SkeletonComponent,
    IconComponent,
  ],
  templateUrl: './perfil.html',
  styleUrl: './perfil.scss',
})
export class OftalmologoPerfilComponent implements OnInit, OnDestroy {
  private readonly oftalmologos = inject(OftalmologoService);
  private readonly citas = inject(CitaService);
  private readonly contexto = inject(ContextoPaginaService);

  /** Ruta `oftalmologos/perfil/:id`. */
  readonly id = input.required<string>();

  protected readonly medico = signal<Oftalmologo | null>(null);
  protected readonly metricas = signal<MetricasOftalmologo | null>(null);
  protected readonly proximas = signal<Cita[]>([]);

  protected readonly columnas = ['Paciente', 'Fecha y Hora', 'Tipo', 'Estado'];

  ngOnInit(): void {
    this.contexto.configurar({
      placeholder: '',
      antetitulo: 'Portal de Administración',
      textoEnlace: 'Soporte',
      accion: { texto: 'Nuevo Registro', destino: '/oftalmologos/nuevo', variante: 'primario' },
    });

    const id = Number(this.id());

    this.oftalmologos.obtener(id).subscribe((medico) => this.medico.set(medico));
    this.oftalmologos.metricas(id).subscribe((m) => this.metricas.set(m));
    this.citas.listar('', '', id).subscribe((citas) => this.proximas.set(citas.slice(0, 4)));
  }

  ngOnDestroy(): void {
    this.contexto.restablecer();
  }

  protected iniciales(nombre: string): string {
    return nombre
      .replace(/^(Dr\.|Dra\.)\s*/i, '')
      .split(/\s+/)
      .slice(0, 2)
      .map((p) => p.charAt(0).toUpperCase())
      .join('');
  }

  /** Las expresiones regulares no están permitidas en plantillas Angular. */
  protected readonly nombreCompleto = computed(() => {
    const medico = this.medico();
    if (!medico) {
      return '';
    }
    return `Dr. ${medico.nombreCompleto.replace(/^(Dr\.|Dra\.)\s*/i, '')}`;
  });

  protected desactivar(): void {
    const medico = this.medico();
    if (!medico) {
      return;
    }
    this.oftalmologos.desactivar(medico.id).subscribe((actualizado) => {
      this.medico.set(actualizado);
    });
  }

  protected readonly horario = [
    'Lunes - Miércoles 09:00 - 14:00',
    'Jueves 15:00 - 20:00',
    'Viernes 09:00 - 15:00',
  ];
}