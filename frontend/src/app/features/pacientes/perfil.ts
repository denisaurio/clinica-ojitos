import { ChangeDetectionStrategy, Component, OnInit, inject, input, signal } from '@angular/core';

import { ButtonComponent } from '../../shared/components/ui-button';
import { CardComponent } from '../../shared/components/ui-card';
import { BadgeComponent } from '../../shared/components/ui-badge';
import { AvatarComponent } from '../../shared/components/ui-avatar';
import { IconComponent } from '../../shared/components/ui-icon';
import { SkeletonComponent } from '../../shared/components/ui-skeleton';
import { PacienteService } from '../../core/services/paciente.service';
import { ActividadReciente, Paciente } from '../../core/models';

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
  ],
  templateUrl: './perfil.html',
  styleUrl: './perfil.scss',
})
export class PacientePerfilComponent implements OnInit {
  private readonly pacientes = inject(PacienteService);

  /** Enrutado como `perfil/:id`; `withComponentInputBinding` lo inyecta. */
  readonly id = input.required<string>();

  protected readonly paciente = signal<Paciente | null>(null);
  protected readonly actividad = signal<ActividadReciente[]>([]);

  ngOnInit(): void {
    const id = Number(this.id());

    this.pacientes.obtener(id).subscribe((paciente) => this.paciente.set(paciente));
    this.pacientes.actividadReciente(id).subscribe((registros) => this.actividad.set(registros));
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