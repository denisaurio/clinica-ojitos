import { ChangeDetectionStrategy, Component, HostListener, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs/operators';

import { SidebarComponent } from './sidebar';
import { TopbarComponent } from './topbar';
import { AuthService } from '../../core/services/auth.service';
import { ContextoPaginaService } from '../../core/services/contexto-pagina.service';

/**
 * Contenedor de la aplicación: barra lateral + barra superior + área de rutas.
 *
 * El paciente no recibe barra lateral (imagen 47): solo ve la barra superior y
 * su portal. El resto de roles reciben la variante de menú que les corresponde.
 */
@Component({
  selector: 'app-shell',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, SidebarComponent, TopbarComponent],
  template: `
    <div class="shell" [class.shell--menu-abierto]="menuMovil()">
      @if (mostrarSidebar()) {
        <app-sidebar [variante]="variante()" />
        <!-- Celular: el menú es un panel deslizante; el velo lo cierra. -->
        <div class="shell__velo" (click)="menuMovil.set(false)"></div>
      }

      <div class="shell__contenido">
        <app-topbar
          [placeholder]="contexto.config().placeholder"
          [insignia]="contexto.config().insignia"
          [iconoInsignia]="contexto.config().iconoInsignia"
          [antetitulo]="contexto.config().antetitulo"
          [textoEnlace]="contexto.config().textoEnlace"
          [accion]="contexto.config().accion"
          [conMenu]="mostrarSidebar()"
          (abrirMenu)="menuMovil.set(true)"
        />
        <main class="shell__principal">
          <router-outlet />
        </main>
      </div>
    </div>
  `,
  styleUrl: './shell.scss',
})
export class ShellComponent {
  private readonly auth = inject(AuthService);

  /** Configuración de la barra superior que fija la pantalla activa. */
  protected readonly contexto = inject(ContextoPaginaService);

  protected readonly mostrarSidebar = computed(() => this.auth.rol() !== 'PACIENTE');

  /** Panel del menú abierto en pantallas de celular (≤ 720 px). */
  protected readonly menuMovil = signal(false);

  constructor() {
    // Al elegir una opción del menú se navega: el panel se cierra solo.
    inject(Router)
      .events.pipe(
        filter((e) => e instanceof NavigationEnd),
        takeUntilDestroyed()
      )
      .subscribe(() => this.menuMovil.set(false));
  }

  @HostListener('document:keydown.escape')
  protected cerrarMenuMovil(): void {
    this.menuMovil.set(false);
  }

  protected readonly variante = computed<'clinico' | 'gestion' | 'operativo'>(() => {
    switch (this.auth.rol()) {
      case 'ADMINISTRADOR':
        return 'gestion';
      case 'RECEPCIONISTA':
        return 'operativo';
      default:
        return 'clinico';
    }
  });
}