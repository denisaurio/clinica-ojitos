import { ChangeDetectionStrategy, Component, OnInit, computed, inject, input, signal } from '@angular/core';
import { AuthService } from '../../core/services/auth.service';

import { ButtonComponent } from '../../shared/components/ui-button';
import { CardComponent } from '../../shared/components/ui-card';
import { BadgeComponent } from '../../shared/components/ui-badge';
import { AvatarComponent } from '../../shared/components/ui-avatar';
import { IconComponent } from '../../shared/components/ui-icon';
import { SkeletonComponent } from '../../shared/components/ui-skeleton';
import { PacienteService } from '../../core/services/paciente.service';
import { ActividadReciente, Credenciales, Paciente } from '../../core/models';
import { CambiarClaveComponent } from '../../shared/components/ui-cambiar-clave';
import { CredencialesComponent } from '../../shared/components/ui-credenciales';
import { AlertComponent } from '../../shared/components/ui-alert';

/**
 * Ficha del paciente (imagen 26): datos personales, antecedentes clínicos con
 * aviso de alergias y actividad reciente.
 *
 * RNF-01 — el backend registra en `auditoria` toda lectura de historial clínico;
 * esta pantalla solo consume `GET /pacientes/{id}` y `.../actividad-reciente`.
 */
@Component({
  selector: 'app-paciente-perfil',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ButtonComponent,
    CardComponent,
    BadgeComponent,
    AvatarComponent,
    IconComponent,
    SkeletonComponent,
    CambiarClaveComponent,
    CredencialesComponent,
    AlertComponent,
  ],
  templateUrl: './perfil.html',
  styleUrl: './perfil.scss',
})
export class PacientePerfilComponent implements OnInit {
  private readonly pacientes = inject(PacienteService);
  private readonly auth = inject(AuthService);
  protected readonly puedeReservar = this.auth.puedeReservar;
  /** Administración y recepción pueden cambiar la contraseña del portal. */
  protected readonly puedeCambiarClave = computed(
    () => this.auth.rol() === 'ADMINISTRADOR' || this.auth.rol() === 'RECEPCIONISTA'
  );
  protected readonly cambioClave = signal(false);
  protected readonly credenciales = signal<Credenciales | null>(null);

  /** Enrutado como `perfil/:id`; `withComponentInputBinding` lo inyecta. */
  readonly id = input.required<string>();

  protected readonly paciente = signal<Paciente | null>(null);
  /** Antes un 403 dejaba la ficha cargando para siempre. */
  protected readonly errorCarga = signal('');
  protected readonly actividad = signal<ActividadReciente[]>([]);

  ngOnInit(): void {
    const id = Number(this.id());

    this.pacientes.obtener(id).subscribe({
      next: (paciente) => this.paciente.set(paciente),
      error: (fallo) =>
        this.errorCarga.set(
          fallo?.status === 403
            ? 'Su rol no puede ver la ficha clínica del paciente. Para cambiarle la contraseña use el candado del listado de pacientes.'
            : fallo?.error?.message || 'No se pudo cargar la ficha del paciente.'
        ),
    });
    this.pacientes.actividadReciente(id).subscribe({
      next: (registros) => this.actividad.set(registros),
      error: () => this.actividad.set([]),
    });
  }

  protected iniciales(nombre: string): string {
    return nombre
      .split(/\s+/)
      .slice(0, 2)
      .map((p) => p.charAt(0).toUpperCase())
      .join('');
  }

  /** Parte un antecedente guardado en saltos de línea o comas en filas de lista. */
  protected lineas(texto: string): string[] {
    if (!texto?.trim()) {
      return [];
    }
    return texto
      .split(/[\n,]+/)
      .map((linea) => linea.trim())
      .filter(Boolean);
  }

  protected readonly iconosActividad: Record<ActividadReciente['tipo'], string> = {
    CONSULTA: 'clipboardList',
    EXAMEN: 'flask',
    CITA: 'calendar',
    TRATAMIENTO: 'pill',
  };
}