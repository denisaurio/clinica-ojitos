import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { ReactiveFormsModule, FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';

import { ButtonComponent } from '../../shared/components/ui-button';
import { InputComponent } from '../../shared/components/ui-input';
import { SelectComponent, OpcionSelect } from '../../shared/components/ui-select';
import { CardComponent } from '../../shared/components/ui-card';
import { AvatarComponent } from '../../shared/components/ui-avatar';
import { BadgeComponent } from '../../shared/components/ui-badge';
import { AlertComponent } from '../../shared/components/ui-alert';
import { IconComponent } from '../../shared/components/ui-icon';
import { CatalogoService } from '../../core/services/catalogo.service';
import { TratamientoService } from '../../core/services/tratamiento.service';
import { PacienteService } from '../../core/services/paciente.service';
import { ContextoPaginaService } from '../../core/services/contexto-pagina.service';
import { DemoDataService } from '../../core/services/demo-data.service';
import { CatalogoItem, TipoTratamiento } from '../../core/models';

interface FilaMedicamento {
  medicamento: FormControl<string>;
  dosis: FormControl<string>;
  frecuencia: FormControl<string>;
  duracionCantidad: FormControl<string>;
  duracionUnidad: FormControl<string>;
  instrucciones: FormControl<string>;
}

/**
 * Prescripción de tratamiento (imagen 34).
 *
 * El catálogo de fármacos es una lista de suggestion del prototipo; el
 * registro que envía la pantalla es el que el backend persiste. El sistema
 * documenta lo que indica el profesional: no calcula posología ni dosis.
 */
@Component({
  selector: 'app-prescripcion',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    ButtonComponent,
    InputComponent,
    SelectComponent,
    CardComponent,
    AvatarComponent,
    BadgeComponent,
    AlertComponent,
    IconComponent,
  ],
  templateUrl: './prescripcion.html',
  styleUrl: './prescripcion.scss',
})
export class PrescripcionComponent implements OnInit, OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly tratamientos = inject(TratamientoService);
  private readonly catalogos = inject(CatalogoService);
  private readonly pacientes = inject(PacienteService);
  private readonly demo = inject(DemoDataService);
  private readonly router = inject(Router);
  private readonly contexto = inject(ContextoPaginaService);

  protected readonly tipo = signal<TipoTratamiento>('MEDICACION');
  protected readonly filas = signal<FormGroup<FilaMedicamento>[]>([]);
  protected readonly pacientesOpciones = signal<OpcionSelect[]>([]);
  protected readonly guardando = signal(false);
  protected readonly error = signal('');

  /** Paciente y fecha de inicio son cabecera de la prescripción, no de cada fila. */
  protected readonly paciente = new FormControl('', {
    nonNullable: true,
    validators: [Validators.required],
  });
  protected readonly fechaInicio = new FormControl(this.hoyIso(), {
    nonNullable: true,
    validators: [Validators.required],
  });

  private tiposCatalogo: CatalogoItem[] = [];
  private estadosCatalogo: CatalogoItem[] = [];

  protected readonly farmacos = this.demo.farmacos;

  protected readonly frecuencias: OpcionSelect[] = [
    '1 vez al día',
    '2 veces al día',
    '3 veces al día',
    'Cada 8 horas',
    'Cada 12 horas',
    'Diaria por la noche',
    'Según necesidad',
  ].map((f) => ({ valor: f, etiqueta: f }));

  protected readonly duraciones: OpcionSelect[] = [
    '7 días', '15 días', '30 días', '3 meses', '6 meses', 'Indefinido',
  ].map((d) => ({ valor: d, etiqueta: d }));

  protected readonly tipos: { valor: TipoTratamiento; etiqueta: string; icono: string }[] = [
    { valor: 'MEDICACION', etiqueta: 'Medicación', icono: 'pill' },
    { valor: 'LENTES', etiqueta: 'Lentes', icono: 'glasses' },
    { valor: 'TERAPIA', etiqueta: 'Terapia', icono: 'zap' },
    { valor: 'CIRUGIA', etiqueta: 'Cirugía', icono: 'scissors' },
  ];

  constructor() {
    this.agregarFila();
  }

  ngOnInit(): void {
    this.contexto.configurar({ placeholder: '' });

    this.catalogos.tiposTratamiento().subscribe((items) => (this.tiposCatalogo = items ?? []));
    this.catalogos.estadosTratamiento().subscribe((items) => (this.estadosCatalogo = items ?? []));

    this.pacientes.listar('', 0, 100).subscribe((pagina) => {
      this.pacientesOpciones.set(
        pagina.content.map((p) => ({ valor: p.id, etiqueta: p.nombreCompleto }))
      );
    });
  }

  ngOnDestroy(): void {
    this.contexto.restablecer();
  }

  protected cambiarTipo(tipo: TipoTratamiento): void {
    this.tipo.set(tipo);
  }

  /** Cada fila del formulario es un `FormGroup` independiente del array. */
  protected agregarFila(): void {
    const fila = this.fb.nonNullable.group({
      medicamento: ['', [Validators.required]],
      dosis: ['', [Validators.required]],
      frecuencia: ['', [Validators.required]],
      duracionCantidad: ['', [Validators.required]],
      duracionUnidad: ['Días', [Validators.required]],
      instrucciones: [''],
    });
    this.filas.update((filas) => [...filas, fila]);
  }

  protected quitarFila(indice: number): void {
    this.filas.update((filas) => filas.filter((_, i) => i !== indice));
  }

  protected invalidos(): boolean {
    return this.filas().some((fila) => fila.invalid);
  }

  protected guardar(): Promise<void> | void {
    this.paciente.markAsTouched();
    this.fechaInicio.markAsTouched();

    if (this.paciente.invalid || this.fechaInicio.invalid || this.invalidos() || this.filas().length === 0) {
      this.filas().forEach((fila) => fila.markAllAsTouched());
      return;
    }

    const tipoId = this.idDeTipo(this.tipo());
    const estadoId = this.idEstadoActivo();
    if (!tipoId || !estadoId) {
      this.error.set('No se pudieron cargar los catálogos de tratamiento. Inténtelo de nuevo.');
      return;
    }

    this.error.set('');
    this.guardando.set(true);
    const pacienteId = Number(this.paciente.value);
    const pendientes = this.filas().map((fila, indice) => {
      const valor = fila.getRawValue();
      return new Promise<void>((resolve, reject) => {
        this.tratamientos
          .crear({
            pacienteId,
            tipoId,
            estadoId,
            medicamento: valor.medicamento,
            dosis: valor.dosis,
            frecuencia: valor.frecuencia,
            duracion: `${valor.duracionCantidad} ${valor.duracionUnidad}`,
            instrucciones: valor.instrucciones,
            fechaInicio: this.fechaInicio.value,
          })
          .subscribe({
            next: () => resolve(),
            error: () => reject(indice),
          });
      });
    });

    Promise.all(pendientes)
      .then(() => {
        this.guardando.set(false);
        this.router.navigate(['/tratamientos/seguimiento', pacienteId]);
      })
      .catch(() => {
        this.guardando.set(false);
        this.error.set('No se pudo guardar la prescripción. Revise los datos e inténtelo de nuevo.');
      });
  }

  protected readonly nombrePaciente = computed(() => {
    const id = Number(this.paciente.value);
    return this.pacientesOpciones().find((p) => Number(p.valor) === id)?.etiqueta ?? '—';
  });

  /** Iniciales del paciente elegido para el avatar de cabecera. */
  protected readonly inicialesPaciente = computed(() =>
    this.nombrePaciente()
      .split(/\s+/)
      .filter((parte) => parte.length > 0)
      .slice(0, 2)
      .map((parte) => parte.charAt(0).toUpperCase())
      .join('')
  );

  /** Traduce la pestaña de la pantalla al id del catálogo `tipo_tratamiento`. */
  private idDeTipo(tipo: TipoTratamiento): number | null {
    const codigos: Record<TipoTratamiento, string[]> = {
      MEDICACION: ['MEDICAMENTO', 'MED'],
      LENTES: ['LENTES', 'LENT'],
      TERAPIA: ['TERAPIA', 'TER'],
      CIRUGIA: ['CIRUGIA', 'CIR'],
    };
    const nombres: Record<TipoTratamiento, string> = {
      MEDICACION: 'medic',
      LENTES: 'lente',
      TERAPIA: 'terapia',
      CIRUGIA: 'cirug',
    };
    const claves = codigos[tipo];
    const encontrado =
      this.tiposCatalogo.find((item) => claves.includes(item.codigo)) ??
      this.tiposCatalogo.find((item) => item.nombre.toLowerCase().includes(nombres[tipo]));
    // Sin catálogo (modo demostración) las pestañas siguen el orden 1–4.
    return encontrado?.id ?? Object.keys(codigos).indexOf(tipo) + 1;
  }

  /** El estado inicial de toda prescripción es «Activo». */
  private idEstadoActivo(): number | null {
    const activo =
      this.estadosCatalogo.find((item) => item.codigo === 'ACTIVO') ??
      this.estadosCatalogo.find((item) => item.nombre.toLowerCase().includes('activo'));
    return activo?.id ?? 1;
  }

  private hoyIso(): string {
    const hoy = new Date();
    const mes = String(hoy.getMonth() + 1).padStart(2, '0');
    const dia = String(hoy.getDate()).padStart(2, '0');
    return `${hoy.getFullYear()}-${mes}-${dia}`;
  }

  /** «Detalles de Medicación», «Detalles de Lentes»… */
  protected readonly tipoActual = computed(() => {
    return this.tipos.find((t) => t.valor === this.tipo())?.etiqueta ?? 'Medicación';
  });
}