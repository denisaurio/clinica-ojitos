import { Routes } from '@angular/router';

export const OFTALMOLOGOS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./directorio').then((m) => m.OftalmologosDirectorioComponent),
  },
  {
    path: 'nuevo',
    loadComponent: () => import('./registro').then((m) => m.OftalmologoRegistroComponent),
  },
  {
    path: 'horarios/:id',
    loadComponent: () => import('./horarios').then((m) => m.OftalmologoHorariosComponent),
  },
  {
    path: 'perfil/:id',
    loadComponent: () => import('./perfil').then((m) => m.OftalmologoPerfilComponent),
  },
  { path: '**', redirectTo: '' },
];