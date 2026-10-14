import { Routes } from '@angular/router';

export const TRATAMIENTOS_ROUTES: Routes = [
  {
    path: 'prescripcion',
    loadComponent: () => import('./prescripcion').then((m) => m.PrescripcionComponent),
  },
  {
    path: 'seguimiento/:id',
    loadComponent: () => import('./seguimiento').then((m) => m.SeguimientoComponent),
  },
  { path: '**', redirectTo: 'prescripcion' },
];