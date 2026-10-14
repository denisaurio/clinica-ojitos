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
  /**
   * Roles que ven esta entrada. Si se omite, la ven todos los que usan el
   * menú: es cortesía visual, la autorización real la aplica el backend.
   */
  solo?: Rol[];
}

/**
 * Los tres menús según el contexto de la pantalla, no del rol.
 *
 * <p>El `variant` lo decide el shell según dónde está el usuario: los módulos de
 * la clínica usan `gestion` y los paneles usan `operativo`. Como un mismo rol
 * recorre varios contextos, cada entrada declara además quién puede verla —
 * sin eso, recepción acabaría con «Resumen del Administrador» en su menú.
 */
const MENUS: Record<'clinico' | 'gestion' | 'operativo', EntradaMenu[]> = {
  clinico: [
    { etiqueta: 'Panel Principal', ruta: '/dashboard/medico', icono: 'grid', solo: ['ADMINISTRADOR', 'OFTALMOLOGO'] },
    { etiqueta: 'Pacientes', ruta: '/pacientes', icono: 'users', exacta: true },
    { etiqueta: 'Historial Médico', ruta: '/historial', icono: 'fileText' },
    { etiqueta: 'Tratamientos', ruta: '/tratamientos/prescripcion', icono: 'pill', solo: ['ADMINISTRADOR', 'OFTALMOLOGO'] },
    { etiqueta: 'Cirugías', ruta: '/cirugias/registro', icono: 'scissors', solo: ['ADMINISTRADOR', 'OFTALMOLOGO'] },
    { etiqueta: 'Agenda', ruta: '/citas/agenda', icono: 'calendar' },
  ],

  /**
   * Módulos de la clínica (pantallas 24, 26, 38).
   *
   * <p>El administrador entra aquí desde el listado de pacientes, así que su
   * panel tiene que aparecer también en este menú: si solo viviera en el de
   * paneles, al navegar a pacientes perdería el camino de vuelta.
   */
  gestion: [
    {
      etiqueta: 'Resumen del Administrador',
      ruta: '/dashboard/admin',
      icono: 'grid',
      exacta: true,
      solo: ['ADMINISTRADOR'],
    },
    {
      etiqueta: 'Panel del Especialista',
      ruta: '/dashboard/medico',
      icono: 'stethoscope',
      solo: ['ADMINISTRADOR'],
    },
    {
      etiqueta: 'Panel de Recepción',
      ruta: '/dashboard/recepcion',
      icono: 'clipboardList',
      solo: ['ADMINISTRADOR'],
    },
    { etiqueta: 'Doctores', ruta: '/oftalmologos', icono: 'briefcase', exacta: true },
    { etiqueta: 'Pacientes', ruta: '/pacientes', icono: 'users', exacta: true },
    { etiqueta: 'Citas', ruta: '/citas/agenda', icono: 'calendar' },
    { etiqueta: 'Historial Médico', ruta: '/historial', icono: 'fileText' },
  ],

  /**
   * Paneles (pantallas 44, 45, 46). Cada entrada apunta a su ruta concreta y no
   * a `/dashboard`, que redirige por rol: así el enlace se mantiene resaltado
   * al navegar y nunca rebota de vuelta.
   */
  operativo: [
    {
      etiqueta: 'Resumen del Administrador',
      ruta: '/dashboard/admin',
      icono: 'grid',
      exacta: true,
      solo: ['ADMINISTRADOR'],
    },
    {
      etiqueta: 'Panel del Especialista',
      ruta: '/dashboard/medico',
      icono: 'stethoscope',
      solo: ['ADMINISTRADOR', 'OFTALMOLOGO'],
    },
    {
      etiqueta: 'Panel de Recepción',
      ruta: '/dashboard/recepcion',
      icono: 'clipboardList',
      solo: ['ADMINISTRADOR', 'RECEPCIONISTA'],
    },
    { etiqueta: 'Pacientes', ruta: '/pacientes', icono: 'users', exacta: true },
    { etiqueta: 'Citas', ruta: '/citas/agenda', icono: 'calendar' },
    { etiqueta: 'Historial Médico', ruta: '/historial', icono: 'fileText' },
  ],
};

/**
 * Menú lateral por rol.
 *
 * <p>Ocultar enlaces es cortesía visual: la autorización real la aplica el
 * backend con {@code @PreAuthorize}. Aun así, esconder lo que no corresponde
 * evita llevar a alguien a una pantalla que le va a rebotar de vuelta.
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

  protected readonly marca = computed(() => {
    switch (this.variante()) {
      case 'clinico':
        return { titulo: 'Portal de Gestión Clínica', subtitulo: 'Gestión Clínica' };
      case 'operativo':
        return { titulo: 'Portal de Gestión Clínica', subtitulo: 'Administración' };
      default:
        return { titulo: 'Ojitos', subtitulo: 'Gestión Clínica' };
    }
  });

  /** Menú del contexto actual, filtrado por el rol con el que se inició sesión. */
  protected readonly entradas = computed<EntradaMenu[]>(() => {
    const rol = this.auth.rol();
    return MENUS[this.variante()].filter(
      (entrada) => !entrada.solo || (rol !== null && entrada.solo.includes(rol))
    );
  });

  protected nombre(): string {
    return this.auth.nombreCompleto() || 'Usuario';
  }

  protected iniciales(): string {
    return this.nombre()
      .replace(/^(Dr\.|Dra\.)\s*/i, '')
      .split(/\s+/)
      .slice(0, 2)
      .map((p) => p.charAt(0).toUpperCase())
      .join('');
  }

  protected rolLegible(): string {
    switch (this.auth.rol()) {
      case 'ADMINISTRADOR':
        return 'Administrador';
      case 'OFTALMOLOGO':
        return 'Oftalmólogo';
      case 'RECEPCIONISTA':
        return 'Recepcionista';
      case 'PACIENTE':
        return 'Paciente';
      default:
        return '';
    }
  }

  protected cerrarSesion(): void {
    this.auth.logout();
    this.router.navigate(['/login']);
  }
}