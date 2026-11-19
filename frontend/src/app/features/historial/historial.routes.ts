import { Routes } from '@angular/router';

export const HISTORIAL_ROUTES: Routes = [
  {
    // Antes redirigía siempre al paciente 5: ahora se elige el paciente.
    path: '',
    pathMatch: 'full',
    loadComponent: () => import('./seleccion').then((m) => m.HistorialSeleccionComponent),
  },
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