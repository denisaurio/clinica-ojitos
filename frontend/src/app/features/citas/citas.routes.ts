import { Routes } from '@angular/router';

export const CITAS_ROUTES: Routes = [
  {
    path: 'agenda',
    loadComponent: () => import('./agenda').then((m) => m.CitaAgendaComponent),
  },
  {
    path: 'reservar',
    loadComponent: () => import('./reservar').then((m) => m.CitaReservarComponent),
  },
  {
    path: 'confirmacion',
    loadComponent: () => import('./confirmacion').then((m) => m.CitaConfirmacionComponent),
  },
  {
    path: 'reprogramar/:id',
    loadComponent: () => import('./reprogramar').then((m) => m.CitaReprogramarComponent),
  },
  { path: '**', redirectTo: 'agenda' },
];