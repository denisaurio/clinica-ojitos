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
    // RF5.5 — edición del médico (antes "Editar perfil" abría un alta nueva).
    path: 'editar/:id',
    loadComponent: () => import('./registro').then((m) => m.OftalmologoRegistroComponent),
  },
  {
    // El médico edita su propio horario (los pacientes reservan sobre él).
    path: 'mi-horario',
    loadComponent: () => import('./horarios').then((m) => m.OftalmologoHorariosComponent),
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