import { Routes } from '@angular/router';

export const CIRUGIAS_ROUTES: Routes = [
  {
    path: 'registro',
    loadComponent: () => import('./registro').then((m) => m.CirugiaRegistroComponent),
  },
  { path: '**', redirectTo: 'registro' },
];