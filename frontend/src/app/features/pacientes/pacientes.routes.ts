import { Routes } from '@angular/router';

import { roleGuard } from '../../core/guards/role.guard';

/**
 * Módulo de pacientes (RF-01): listado, alta en tres pasos y ficha clínica.
 * El paciente solo accede a su propia ficha; el resto de roles, al registro.
 */
export const PACIENTES_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./lista').then((m) => m.PacientesListaComponent),
  },
  {
    path: 'nuevo',
    canActivate: [roleGuard(['ADMINISTRADOR', 'RECEPCIONISTA', 'OFTALMOLOGO'])],
    loadComponent: () => import('./nuevo').then((m) => m.PacienteNuevoComponent),
  },
  {
    path: 'perfil/:id',
    loadComponent: () => import('./perfil').then((m) => m.PacientePerfilComponent),
  },
  { path: '**', redirectTo: '' },
];