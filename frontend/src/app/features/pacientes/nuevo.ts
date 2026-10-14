import { ChangeDetectionStrategy, Component, OnDestroy, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, takeUntil } from 'rxjs/operators';

import { ButtonComponent } from '../../shared/components/ui-button';
import { InputComponent } from '../../shared/components/ui-input';
import { SelectComponent, OpcionSelect } from '../../shared/components/ui-select';
import { CardComponent } from '../../shared/components/ui-card';
import { StepperComponent, PasoStepper } from '../../shared/components/ui-stepper';
import { AlertComponent } from '../../shared/components/ui-alert';
import { IconComponent } from '../../shared/components/ui-icon';
import { AvatarComponent } from '../../shared/components/ui-avatar';
import { PacienteService } from '../../core/services/paciente.service';
import { CatalogoService } from '../../core/services/catalogo.service';

/**
 * Alta de paciente en tres pasos (imagen 25).
 *
 * RF1.2 — el documento de identidad es único: se valida contra
 * `/pacientes/existe-documento` mientras se escribe, no solo al enviar.
 */
@Component({
  selector: 'app-paciente-nuevo',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    ButtonComponent,
    InputComponent,
    SelectComponent,
    CardComponent,
    StepperComponent,
    AlertComponent,
    IconComponent,
    AvatarComponent,
  ],
  templateUrl: './nuevo.html',
  styleUrl: './nuevo.scss',
})
export class PacienteNuevoComponent implements OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly pacientes = inject(PacienteService);
  private readonly catalogos = inject(CatalogoService);
  private readonly router = inject(Router);

  private readonly destruido = new Subject<void>();

  protected readonly paso = signal(1);

  protected readonly seguros = signal<OpcionSelect[]>([]);
  protected readonly gruposSanguineos: OpcionSelect[] = ['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'].map(
    (g) => ({ valor: g, etiqueta: g })
  );

  protected readonly documentoDuplicado = signal(false);
  protected readonly guardando = signal(false);
  protected readonly error = signal('');

  protected readonly formulario = this.fb.nonNullable.group({
    nombres: ['', [Validators.required, Validators.minLength(2)]],
    apellidos: ['', [Validators.required, Validators.minLength(2)]],
    documento: ['', [Validators.required, Validators.minLength(5)]],
    fechaNacimiento: ['', [Validators.required]],
    telefono: ['', [Validators.required, Validators.minLength(7)]],
    email: ['', [Validators.email]],
    direccion: [''],
    seguro: [''],
    grupoSanguineo: [''],
    antecedentesOculares: [''],
    alergias: [''],
  });

  constructor() {
    this.catalogos
      .seguros()
      .pipe(takeUntil(this.destruido))
      .subscribe((items) => this.seguros.set(items.map((s) => ({ valor: s.nombre, etiqueta: s.nombre }))));

    // Validación de duplicado en tiempo real (RF1.2).
    this.formulario.controls.documento.valueChanges
      .pipe(debounceTime(350), distinctUntilChanged(), takeUntil(this.destruido))
      .subscribe((documento) => {
        if (documento.trim().length < 5) {
          this.documentoDuplicado.set(false);
          return;
        }
        this.pacientes.existeDocumento(documento).subscribe((respuesta) => {
          this.documentoDuplicado.set(respuesta.existe);
          if (respuesta.existe) {
            this.formulario.controls.documento.setErrors({ duplicado: true });
          } else if (this.formulario.controls.documento.hasError('duplicado')) {
            this.formulario.controls.documento.setErrors(null);
          }
        });
      });
  }

  ngOnDestroy(): void {
    this.destruido.next();
    this.destruido.complete();
  }

  protected readonly pasos = (): PasoStepper[] => [
    { etiqueta: 'Datos Personales', activo: this.paso() === 1, completado: this.paso() > 1 },
    { etiqueta: 'Antecedentes', activo: this.paso() === 2, completado: this.paso() > 2 },
    { etiqueta: 'Confirmación', activo: this.paso() === 3 },
  ];

  protected get c() {
    return this.formulario.controls;
  }

  /** Edad derivada de la fecha de nacimiento, mostrada como ayuda del campo. */
  protected edad(): number | null {
    const valor = this.c.fechaNacimiento.value;
    if (!valor) {
      return null;
    }
    const nacimiento = new Date(`${valor}T00:00:00`);
    const hoy = new Date();
    let edad = hoy.getFullYear() - nacimiento.getFullYear();
    const mes = hoy.getMonth() - nacimiento.getMonth();
    if (mes < 0 || (mes === 0 && hoy.getDate() < nacimiento.getDate())) {
      edad -= 1;
    }
    return edad >= 0 && edad < 130 ? edad : null;
  }

  protected inicial(): string {
    const nombres = this.c.nombres.value.charAt(0);
    const apellidos = this.c.apellidos.value.charAt(0);
    return `${nombres}${apellidos}`.toUpperCase();
  }

  protected nombreCompleto(): string {
    return `${this.c.nombres.value} ${this.c.apellidos.value}`.trim();
  }

  protected errorDe(campo: keyof typeof this.c, mensaje: string): string {
    const control = this.c[campo];
    return control.invalid && control.touched ? mensaje : '';
  }

  /** El documento cambia de mensaje según si falta o ya está registrado (RF1.2). */
  protected errorDocumento(): string {
    const control = this.c.documento;
    if (!control.invalid || !control.touched) {
      return '';
    }
    if (this.documentoDuplicado()) {
      return 'Este DNI ya está registrado.';
    }
    return control.hasError('minlength') ? 'El documento es demasiado corto.' : 'El documento es obligatorio.';
  }

  protected siguiente(): void {
    const camposDelPaso = this.paso() === 1
      ? ['nombres', 'apellidos', 'documento', 'fechaNacimiento', 'telefono']
      : [];

    for (const nombre of camposDelPaso) {
      this.c[nombre as keyof typeof this.c].markAsTouched();
    }

    if (camposDelPaso.some((n) => this.c[n as keyof typeof this.c].invalid)) {
      return;
    }

    if (this.paso() < 3) {
      this.paso.update((valor) => valor + 1);
    }
  }

  protected anterior(): void {
    if (this.paso() > 1) {
      this.paso.update((valor) => valor - 1);
    }
  }

  protected guardar(): void {
    this.guardando.set(true);
    this.error.set('');

    this.pacientes.crear(this.formulario.getRawValue()).subscribe({
      next: (paciente) => this.router.navigate(['/pacientes/perfil', paciente.id]),
      error: () => {
        this.guardando.set(false);
        this.error.set('No se pudo registrar el paciente. Revise los datos e inténtelo de nuevo.');
      },
    });
  }
}