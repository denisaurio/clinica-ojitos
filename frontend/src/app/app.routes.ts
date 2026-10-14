import { Routes } from '@angular/router';

import { authGuard, roleGuard } from './core/guards/role.guard';
import { ShellComponent } from './shared/layout/shell';

/**
 * Tabla de rutas del portal.
 *
 * Cada módulo funcional se carga de forma diferida (`loadChildren`), tal y como
 * exige la convención del proyecto. `authGuard` protege el contenedor con
 * barra lateral; `roleGuard` acota además las pantallas por rol.
 *
 * Roles: ADMINISTRADOR, OFTALMOLOGO, RECEPCIONISTA, PACIENTE.
 */
export const routes: Routes = [
  // ------------------------------------------------------------- Acceso
  {
    path: 'login',
    loadComponent: () =>
      import('./features/auth/login/login').then((m) => m.LoginComponent),
  },
  {
    path: 'recuperar-clave',
    loadComponent: () =>
      import('./features/auth/recuperar-clave/recuperar-clave').then(
        (m) => m.RecuperarClaveComponent
      ),
  },

  // ------------------------------------------------- Aplicación con shell
  {
    path: '',
    component: ShellComponent,
    canActivate: [authGuard],
    children: [
      {
        path: 'dashboard',
        loadChildren: () =>
          import('./features/dashboard/dashboard.routes').then((m) => m.DASHBOARD_ROUTES),
      },
      {
        path: 'pacientes',
        loadChildren: () =>
          import('./features/pacientes/pacientes.routes').then((m) => m.PACIENTES_ROUTES),
      },
      {
        path: 'historial',
        loadChildren: () =>
          import('./features/historial/historial.routes').then((m) => m.HISTORIAL_ROUTES),
      },
      {
        path: 'citas',
        loadChildren: () =>
          import('./features/citas/citas.routes').then((m) => m.CITAS_ROUTES),
      },
      {
        path: 'tratamientos',
        loadChildren: () =>
          import('./features/tratamientos/tratamientos.routes').then((m) => m.TRATAMIENTOS_ROUTES),
      },
      {
        path: 'cirugias',
        loadChildren: () =>
          import('./features/cirugias/cirugias.routes').then((m) => m.CIRUGIAS_ROUTES),
      },
      {
        path: 'oftalmologos',
        canActivate: [roleGuard(['ADMINISTRADOR', 'OFTALMOLOGO'])],
        loadChildren: () =>
          import('./features/oftalmologos/oftalmologos.routes').then(
            (m) => m.OFTALMOLOGOS_ROUTES
          ),
      },
      {
        path: 'configuracion',
        loadComponent: () =>
          import('./features/configuracion/configuracion').then(
            (m) => m.ConfiguracionComponent
          ),
      },
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
    ],
  },

  { path: '**', redirectTo: 'dashboard' },
];