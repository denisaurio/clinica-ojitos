import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';

import { IconComponent } from '../components/ui-icon';
import { ButtonComponent } from '../components/ui-button';
import { AvatarComponent } from '../components/ui-avatar';
import { AuthService } from '../../core/services/auth.service';
import { Rol } from '../../core/models';

interface EntradaMenu {
  etiqueta: string;
  ruta: string;
  icono: string;
  /** Marca de coincidencia exacta: evita que «/pacientes/5» active la lista. */
  exacta?: boolean;
}

const MENUS: Record<'clinico' | 'gestion' | 'operativo', EntradaMenu[]> = {
  clinico: [
    { etiqueta: 'Panel Principal', ruta: '/dashboard/medico', icono: 'grid' },
    { etiqueta: 'Pacientes', ruta: '/pacientes', icono: 'users', exacta: true },
    { etiqueta: 'Historial Médico', ruta: '/historial', icono: 'fileText' },
    { etiqueta: 'Tratamientos', ruta: '/tratamientos/prescripcion', icono: 'pill' },
    { etiqueta: 'Cirugías', ruta: '/cirugias/registro', icono: 'scissors' },
    { etiqueta: 'Agenda', ruta: '/citas/agenda', icono: 'calendar' },
  ],
  /**
   * Módulos de la clínica (pantallas 24, 26, 38). El administrador entra aquí
   * desde el listado de pacientes, así que el acceso a su panel tiene que estar
   * también en este menú: si solo viviera en el de los paneles, al navegar a
   * pacientes se perdería el camino de vuelta.
   */
  gestion: [
    { etiqueta: 'Resumen del Administrador', ruta: '/dashboard/admin', icono: 'grid', exacta: true },
    { etiqueta: 'Doctores', ruta: '/oftalmologos', icono: 'briefcase', exacta: true },
    { etiqueta: 'Pacientes', ruta: '/pacientes', icono: 'users', exacta: true },
    { etiqueta: 'Citas', ruta: '/citas/agenda', icono: 'calendar' },
    { etiqueta: 'Historial Médico', ruta: '/historial', icono: 'fileText' },
  ],
  /**
   * Paneles (pantallas 44, 45, 46). Cada entrada apunta a su ruta concreta y
   * no a `/dashboard`, que redirige por rol: así el enlace se mantiene
   * resaltado al navegar.
   */
  operativo: [
    { etiqueta: 'Resumen del Administrador', ruta: '/dashboard/admin', icono: 'grid', exacta: true },
    { etiqueta: 'Panel del Especialista', ruta: '/dashboard/medico', icono: 'stethoscope' },
    { etiqueta: 'Panel de Recepción', ruta: '/dashboard/recepcion', icono: 'clipboardList' },
    { etiqueta: 'Pacientes', ruta: '/pacientes', icono: 'users', exacta: true },
    { etiqueta: 'Citas', ruta: '/citas/agenda', icono: 'calendar' },
    { etiqueta: 'Historial Médico', ruta: '/historial', icono: 'fileText' },
  ],
};

/**
 * Menú lateral por rol.
 *
 * Ocultar enlaces es cortesía visual: la autorización real la aplica el backend
 * en cada endpoint (AGENTS.md §5.1).
 */
@Component({
  selector: 'app-sidebar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, RouterLinkActive, IconComponent, ButtonComponent, AvatarComponent],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.scss',
})
export class SidebarComponent {
  readonly variante = input<'clinico' | 'gestion' | 'operativo'>('clinico');

  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly rol = this.auth.rol;
  protected readonly nombre = this.auth.nombreCompleto;

  protected readonly marca = computed(() => {
    switch (this.variante()) {
      case 'gestion':
        return { titulo: 'Portal de Gestión Clínica', subtitulo: 'Portal de Gestión Clínica' };
      case 'operativo':
        return { titulo: 'Ojitos', subtitulo: 'Gestión Clínica' };
      default:
        return { titulo: 'Portal Clínico', subtitulo: 'Gestión Clínica' };
    }
  });

  protected readonly entradas = computed<EntradaMenu[]>(() => MENUS[this.variante()]);

  /** Rol shown under the user chip at the bottom of the admin sidebar. */
  protected readonly rolLegible = computed(() => {
    const etiquetas: Record<Rol, string> = {
      ADMINISTRADOR: 'Administrador',
      OFTALMOLOGO: 'Oftalmólogo',
      RECEPCIONISTA: 'Recepción',
      PACIENTE: 'Paciente',
    };
    const rol = this.rol();
    return rol ? etiquetas[rol] : '';
  });

  protected readonly iniciales = computed(() => {
    const nombre = this.auth.nombreCompleto().replace(/^(Dr\.|Dra\.)\s*/i, '');
    return nombre
      .split(/\s+/)
      .slice(0, 2)
      .map((p) => p.charAt(0).toUpperCase())
      .join('');
  });

  protected cerrarSesion(): void {
    this.auth.logout();
    this.router.navigate(['/login']);
  }
}