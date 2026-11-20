import { Routes } from '@angular/router';
import { roleGuard } from '../../core/guards/role.guard';

export const CITAS_ROUTES: Routes = [
  {
    path: 'agenda',
    loadComponent: () => import('./agenda').then((m) => m.CitaAgendaComponent),
  },
  {
    path: 'reservar',
    // El oftalmólogo no crea citas: las reserva el paciente o recepción.
    canActivate: [roleGuard(['ADMINISTRADOR', 'RECEPCIONISTA', 'PACIENTE'])],
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