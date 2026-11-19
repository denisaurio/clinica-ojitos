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
import { ModalComponent } from '../../shared/components/ui-modal';
import { CredencialesComponent } from '../../shared/components/ui-credenciales';
import { CambiarClaveMedicoComponent } from './cambiar-clave';
import { OftalmologoService } from '../../core/services/oftalmologo.service';
import { CitaService } from '../../core/services/cita.service';
import { ContextoPaginaService } from '../../core/services/contexto-pagina.service';
import { BloqueHorario, Cita, Credenciales, EstadoCita, MetricasOftalmologo, Oftalmologo } from '../../core/models';

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
    ModalComponent,
    CredencialesComponent,
    CambiarClaveMedicoComponent,
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
  protected readonly bloques = signal<BloqueHorario[] | null>(null);

  protected readonly confirmarBaja = signal(false);
  protected readonly procesando = signal(false);
  protected readonly aviso = signal('');
  /** Credencial recién emitida; se muestra una sola vez. */
  protected readonly credenciales = signal<Credenciales | null>(null);
  /** Modal para que el administrador escriba la nueva contraseña. */
  protected readonly cambioClave = signal(false);

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
    this.oftalmologos.horarios(id).subscribe({
      next: (h) => this.bloques.set(h.bloques),
      error: () => this.bloques.set([]),
    });
    // Próximas = desde hoy, sin canceladas, en orden. Antes salían las 4
    // primeras de toda la historia, pasadas y canceladas incluidas.
    const hoy = new Date().toISOString().slice(0, 10);
    this.citas.listar(hoy, '', id).subscribe((citas) =>
      this.proximas.set(
        citas
          .filter((c) => c.estadoCita !== 'CANCELADA' && c.estadoCita !== 'NO_ASISTIO')
          .sort((a, b) => `${a.fecha} ${a.horaInicio}`.localeCompare(`${b.fecha} ${b.horaInicio}`))
          .slice(0, 5)
      )
    );
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
    // Sin título fijo: antes la miga decía siempre "Dra." y el título "Dr.".
    return medico.nombreCompleto.replace(/^(Dr\.|Dra\.)\s*/i, '');
  });

  /**
   * Horario real del médico agrupado por día (RF5.4). Antes se mostraban tres
   * franjas fijas, iguales para todos los médicos.
   */
  protected readonly horario = computed(() => {
    const bloques = this.bloques();
    if (!bloques) return null;
    const orden: Record<string, number> = { LUNES: 1, MARTES: 2, MIERCOLES: 3, JUEVES: 4, VIERNES: 5, SABADO: 6, DOMINGO: 7 };
    const nombre: Record<string, string> = {
      LUNES: 'Lunes', MARTES: 'Martes', MIERCOLES: 'Miércoles', JUEVES: 'Jueves',
      VIERNES: 'Viernes', SABADO: 'Sábado', DOMINGO: 'Domingo',
    };
    const porDia = new Map<string, string[]>();
    bloques
      .filter((b) => b.tipo !== 'DESCANSO' && b.activo !== false)
      .sort((a, b) => (orden[a.dia] ?? 9) - (orden[b.dia] ?? 9) || a.horaInicio.localeCompare(b.horaInicio))
      .forEach((b) => porDia.set(b.dia, [...(porDia.get(b.dia) ?? []), `${b.horaInicio}–${b.horaFin}`]));
    return [...porDia.entries()].map(([dia, franjas]) => ({ dia: nombre[dia] ?? dia, franjas: franjas.join(' · ') }));
  });

  protected etiquetaEstado(estado: EstadoCita): string {
    const textos: Partial<Record<EstadoCita, string>> = {
      PROGRAMADA: 'Programada', CONFIRMADA: 'Confirmada', EN_ESPERA: 'En espera',
      EN_CURSO: 'En consulta', COMPLETADA: 'Completada',
    };
    return textos[estado] ?? estado;
  }

  protected varianteEstado(estado: EstadoCita): 'success' | 'warning' | 'info' {
    if (estado === 'CONFIRMADA' || estado === 'COMPLETADA') return 'success';
    if (estado === 'EN_ESPERA' || estado === 'EN_CURSO') return 'warning';
    return 'info';
  }

  /** RF5.5 — desactivar pide confirmación (antes era inmediato). */
  protected desactivar(): void {
    const medico = this.medico();
    if (!medico) return;
    this.procesando.set(true);
    this.oftalmologos.desactivar(medico.id).subscribe({
      next: (actualizado) => {
        this.procesando.set(false);
        this.confirmarBaja.set(false);
        this.medico.set(actualizado);
        this.aviso.set('El médico quedó inactivo: ya no aparece para nuevas citas.');
      },
      error: () => {
        this.procesando.set(false);
        this.confirmarBaja.set(false);
        this.aviso.set('No se pudo desactivar al médico. Inténtelo de nuevo.');
      },
    });
  }

  /** Vuelve a activar un perfil desactivado (antes no había forma desde la pantalla). */
  protected reactivar(): void {
    const m = this.medico();
    if (!m) return;
    this.procesando.set(true);
    this.oftalmologos
      .actualizar(
        m.id,
        {
          nombres: m.nombres,
          apellidos: m.apellidos,
          email: m.email,
          telefono: m.telefono,
          numeroColegiatura: m.numeroColegiatura,
          subespecialidad: m.subespecialidad,
          sede: m.sede,
        },
        true
      )
      .subscribe({
        next: (actualizado) => {
          this.procesando.set(false);
          this.medico.set({ ...m, ...actualizado, activo: true });
          this.aviso.set('El médico vuelve a estar activo.');
        },
        error: () => {
          this.procesando.set(false);
          this.aviso.set('No se pudo reactivar al médico.');
        },
      });
  }
}
