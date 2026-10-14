import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';

import { IconComponent } from '../components/ui-icon';
import { AvatarComponent } from '../components/ui-avatar';
import { ButtonComponent } from '../components/ui-button';
import { AccionTopbar } from '../../core/services/contexto-pagina.service';
import { AuthService } from '../../core/services/auth.service';

/**
 * Barra superior: buscador global, avisos, ayuda y el menú de usuario.
 * El buscador lleva a la lista de pacientes con el término ya aplicado.
 */
@Component({
  selector: 'app-topbar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent, AvatarComponent, ButtonComponent, RouterLink],
  templateUrl: './topbar.html',
  styleUrl: './topbar.scss',
})
export class TopbarComponent {
  /** Texto del buscador; vacío lo oculta (pantallas de ficha clínica). */
  readonly placeholder = input('Buscar pacientes...');

  /** Etiqueta informativa a la izquierda, p. ej. «Vista del Paciente (Visita)». */
  readonly insignia = input('');

  readonly iconoInsignia = input('');

  readonly antetitulo = input('');

  readonly textoEnlace = input('');

  readonly accion = input<AccionTopbar | null>(null);

  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly termino = signal('');
  protected readonly menuAbierto = signal(false);

  protected readonly nombre = this.auth.nombreCompleto;
  protected readonly rol = this.auth.rol;

  protected readonly iniciales = computed(() => {
    const nombre = this.auth
      .nombreCompleto()
      .replace(/^(Dr\.|Dra\.)\s*/i, '')
      .split(/\s+/)
      .slice(0, 2)
      .map((p) => p.charAt(0).toUpperCase())
      .join('');
    return nombre || 'U';
  });

  protected readonly rolLegible = computed(() => {
    switch (this.rol()) {
      case 'ADMINISTRADOR':
        return 'Administrador';
      case 'OFTALMOLOGO':
        return 'Oftalmólogo';
      case 'RECEPCIONISTA':
        return 'Recepción';
      case 'PACIENTE':
        return 'Paciente';
      default:
        return '';
    }
  });

  protected alBuscar(evento: Event): void {
    this.termino.set((evento.target as HTMLInputElement).value);
  }

  protected buscar(): void {
    const termino = this.termino().trim();
    if (!termino) {
      return;
    }
    this.router.navigate(['/pacientes'], { queryParams: { buscar: termino } });
  }

  protected cerrarSesion(): void {
    this.menuAbierto.set(false);
    this.auth.logout();
    this.router.navigate(['/login']);
  }
}