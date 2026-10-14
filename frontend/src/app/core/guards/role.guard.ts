import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { Rol } from '../models';
import { AuthService } from '../services/auth.service';

/**
 * Impide el acceso a una ruta sin sesión activa.
 * No sustituye a la autorización del backend: solo evita mostrar una pantalla
 * que el servidor rechazaría.
 */
export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (auth.autenticado()) {
    return true;
  }
  return router.createUrlTree(['/login']);
};

/**
 * Restringe una ruta a los roles indicados.
 *
 * El rol se lee de la signal `rol()` de `AuthService`; al ser una signal, el
 * guard se vuelve a evaluar cuando la sesión cambia.
 */
export function roleGuard(roles: Rol[]): CanActivateFn {
  return () => {
    const auth = inject(AuthService);
    const router = inject(Router);

    if (!auth.autenticado()) {
      return router.createUrlTree(['/login']);
    }

    const rol = auth.rol();
    if (rol && roles.includes(rol)) {
      return true;
    }

    // Si el usuario tiene otro rol, se le envía a su propio panel.
    return router.createUrlTree([panelDe(rol)]);
  };
}

/** Ruta de inicio según el rol con el que se ha iniciado sesión. */
export function panelDe(rol: Rol | null): string {
  switch (rol) {
    case 'ADMINISTRADOR':
      return '/dashboard/admin';
    case 'OFTALMOLOGO':
      return '/dashboard/medico';
    case 'RECEPCIONISTA':
      return '/dashboard/recepcion';
    case 'PACIENTE':
      return '/dashboard/paciente';
    default:
      return '/login';
  }
}