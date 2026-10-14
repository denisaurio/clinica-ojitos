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
import { ModalComponent } from '../../shared/components/ui-modal';
import { Credenciales } from '../../core/models';
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
    ModalComponent,
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
    /** Credenciales de acceso al portal del paciente. */
    usuario: [''],
    password: ['', [Validators.required, Validators.minLength(8)]],
    repetirPassword: ['', [Validators.required]],
  });

  /** Credenciales del portal, mostradas una sola vez tras el alta. */
  protected readonly credenciales = signal<Credenciales | null>(null);

  /** Documento del paciente recién creado; permite volver a su ficha. */
  protected readonly pacienteId = signal<string>('');

  /** `true` cuando las dos contraseñas escritas coinciden. */
  protected coinciden(): boolean {
    const a = this.c.password.value;
    const b = this.c.repetirPassword.value;
    return a.length > 0 && a === b;
  }

  /** Contraseña temporal sugerida, para no tener que inventarla en el mostrador. */
  protected usarSugerida(): void {
    const sugerida = this.generarSugerida();
    this.c.password.setValue(sugerida);
    this.c.repetirPassword.setValue(sugerida);
  }

  private generarSugerida(): string {
    const letras = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
    const numeros = '23456789';
    let clave = '';
    for (let i = 0; i < 8; i++) {
      clave += letras.charAt(Math.floor(Math.random() * letras.length));
    }
    clave += numeros.charAt(Math.floor(Math.random() * numeros.length));
    clave += '!@#$'.charAt(Math.floor(Math.random() * 4));
    return clave;
  }

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
    if (this.formulario.invalid) {
      this.formulario.markAllAsTouched();
      return;
    }

    if (!this.coinciden()) {
      this.error.set('Las dos contraseñas no coinciden.');
      return;
    }

    this.guardando.set(true);
    this.error.set('');

    const valores = this.formulario.getRawValue();
    const { repetirPassword, ...peticion } = valores;

    this.pacientes.crear({ ...peticion, password: valores.password }).subscribe({
      next: (alta) => {
        this.guardando.set(false);
        // Las credenciales se muestran una sola vez, al dar de alta.
        this.credenciales.set(alta.credenciales);
      },
      error: (fallo) => {
        this.guardando.set(false);
        this.error.set(
          fallo?.error?.message ||
            'No se pudo registrar el paciente. Revise los datos e inténtelo de nuevo.'
        );
      },
    });
  }

  /** Cierra el aviso de credenciales y vuelve al listado. */
  protected continuar(): void {
    this.credenciales.set(null);
    this.router.navigate(['/pacientes']);
  }

  /** Descarga la credencial como archivo de texto para entregarla impreso. */
  protected descargarCredenciales(): void {
    const c = this.credenciales();
    if (!c) return;

    const blob = new Blob([c.textoParaDescargar], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const enlace = document.createElement('a');
    enlace.href = url;
    enlace.download = `credenciales-${c.username.replace(/\s+/g, '-')}.txt`;
    enlace.click();
    URL.revokeObjectURL(url);
  }
}
