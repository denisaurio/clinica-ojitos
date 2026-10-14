import { Routes } from '@angular/router';

import { roleGuard } from '../../core/guards/role.guard';

/**
 * Paneles por rol (imágenes 44–47). La ruta `/dashboard` sin sufijo redirige al
 * panel que corresponde al rol con el que se inició sesión.
 */
export const DASHBOARD_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./inicio').then((m) => m.InicioComponent),
  },
  {
    path: 'admin',
    canActivate: [roleGuard(['ADMINISTRADOR'])],
    loadComponent: () => import('./admin').then((m) => m.AdminDashboardComponent),
  },
  {
    path: 'medico',
    canActivate: [roleGuard(['ADMINISTRADOR', 'OFTALMOLOGO'])],
    loadComponent: () => import('./medico').then((m) => m.MedicoDashboardComponent),
  },
  {
    path: 'recepcion',
    canActivate: [roleGuard(['ADMINISTRADOR', 'RECEPCIONISTA'])],
    loadComponent: () => import('./recepcion').then((m) => m.RecepcionDashboardComponent),
  },
  {
    path: 'paciente',
    canActivate: [roleGuard(['ADMINISTRADOR', 'PACIENTE'])],
    loadComponent: () => import('./paciente').then((m) => m.PacienteDashboardComponent),
  },
];