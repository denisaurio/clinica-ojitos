import { Routes } from '@angular/router';

export const HISTORIAL_ROUTES: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'paciente/5' },
  {
    path: 'paciente/:id',
    loadComponent: () => import('./timeline').then((m) => m.HistorialTimelineComponent),
  },
  {
    path: 'evolucion/:id',
    loadComponent: () => import('./evolucion').then((m) => m.HistorialEvolucionComponent),
  },
  {
    path: 'nueva-consulta',
    loadComponent: () => import('./nueva-consulta').then((m) => m.NuevaConsultaComponent),
  },
  { path: '**', redirectTo: '' },
];