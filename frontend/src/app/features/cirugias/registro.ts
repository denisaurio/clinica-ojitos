import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  OnInit,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';

import { ButtonComponent } from '../../shared/components/ui-button';
import { InputComponent } from '../../shared/components/ui-input';
import { SelectComponent, OpcionSelect } from '../../shared/components/ui-select';
import { CardComponent } from '../../shared/components/ui-card';
import { AlertComponent } from '../../shared/components/ui-alert';
import { TratamientoService } from '../../core/services/tratamiento.service';
import { PacienteService } from '../../core/services/paciente.service';
import { OftalmologoService } from '../../core/services/oftalmologo.service';
import { ContextoPaginaService } from '../../core/services/contexto-pagina.service';
import { DemoDataService } from '../../core/services/demo-data.service';
import { HistorialService } from '../../core/services/historial.service';
import { AuthService } from '../../core/services/auth.service';
import { Consulta, Lateralidad } from '../../core/models';

/**
 * Registro de procedimiento quirúrgico (imagen 36), en tres bloques:
 * información del paciente, detalles del procedimiento y notas quirúrgicas.
 *
 * Laterales según el dominio oftalmológico: OD, OI o AO (AGENTS.md §4).
 */
@Component({
  selector: 'app-cirugia-registro',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    ButtonComponent,
    InputComponent,
    SelectComponent,
    CardComponent,
    AlertComponent,
  ],
  templateUrl: './registro.html',
  styleUrl: './registro.scss',
})
export class CirugiaRegistroComponent implements OnInit, OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly cirugias = inject(TratamientoService);
  private readonly pacientes = inject(PacienteService);
  private readonly oftalmologos = inject(OftalmologoService);
  private readonly demo = inject(DemoDataService);
  private readonly router = inject(Router);
  private readonly contexto = inject(ContextoPaginaService);
  private readonly historial = inject(HistorialService);
  private readonly auth = inject(AuthService);

  /** Query params desde el historial: ?paciente=1&consulta=5. */
  readonly paciente = input<string>();
  readonly consulta = input<string>();

  /** Consultas del paciente; solo las firmadas pueden vincularse. */
  protected readonly consultasPaciente = signal<Consulta[]>([]);
  protected readonly seleccionadas = signal<Set<number>>(new Set());
  protected readonly firmadas = computed(() => this.consultasPaciente().filter((c) => !!c.firmadaEn));
  protected readonly sinFirmar = computed(() => this.consultasPaciente().filter((c) => !c.firmadaEn).length);

  protected readonly tiposCirugia: OpcionSelect[] = this.demo.tiposCirugia.map((t) => ({
    valor: t,
    etiqueta: t,
  }));

  protected readonly estados: OpcionSelect[] = [
    { valor: 'PROGRAMADA', etiqueta: 'Programada (se operará)' },
    { valor: 'REALIZADA', etiqueta: 'Realizada (ya se operó)' },
  ];

  protected readonly anestesias: OpcionSelect[] = [
    'Tópica', 'Peribulbar', 'Retrobulbar', 'General'
  ].map((a) => ({ valor: a, etiqueta: a }));

  protected readonly pacientesOpciones = signal<OpcionSelect[]>([]);
  protected readonly oftalmologosOpciones = signal<OpcionSelect[]>([]);

  protected readonly guardando = signal(false);
  protected readonly error = signal('');

  protected readonly formulario = this.fb.nonNullable.group({
    pacienteId: [null as number | null, [Validators.required]],
    oftalmologoId: [null as number | null, [Validators.required]],
    diagnosticoPreoperatorio: ['', [Validators.required]],
    tipoCirugia: ['', [Validators.required]],
    estado: ['PROGRAMADA' as 'PROGRAMADA' | 'REALIZADA', [Validators.required]],
    fecha: [this.hoyIso(), [Validators.required]],
    lateralidad: ['OD' as Lateralidad, [Validators.required]],
    tipoAnestesia: ['Tópica', [Validators.required]],
    // Solo es obligatorio cuando la cirugía ya se realizó.
    reporteOperatorio: [''],
  });

  ngOnInit(): void {
    this.contexto.configurar({
      placeholder: '',
      antetitulo: 'CIRUGÍAS > Nuevo Registro',
    });

    this.pacientes.listar('', 0, 100).subscribe((pagina) => {
      this.pacientesOpciones.set(
        pagina.content.map((p) => ({ valor: p.id, etiqueta: p.nombreCompleto }))
      );
    });

    this.oftalmologos.activos().subscribe((items) => {
      this.oftalmologosOpciones.set(
        items.map((o) => ({ valor: o.id, etiqueta: o.nombreCompleto }))
      );
    });

    // El médico que indica la cirugía es, por defecto, el responsable.
    if (this.auth.rol() === 'OFTALMOLOGO') {
      this.oftalmologos.yo().subscribe({
        next: (m) => this.c.oftalmologoId.setValue(m.id),
        error: () => undefined,
      });
    }

    this.c.pacienteId.valueChanges.subscribe((id) => this.cargarConsultas(id));

    const desdeHistorial = Number(this.paciente());
    if (desdeHistorial) {
      this.c.pacienteId.setValue(desdeHistorial);
    }
  }

  private cargarConsultas(pacienteId: number | null): void {
    this.consultasPaciente.set([]);
    this.seleccionadas.set(new Set());
    if (!pacienteId) return;
    this.historial.delPaciente(Number(pacienteId)).subscribe({
      next: (lista) => {
        this.consultasPaciente.set(lista);
        const preelegida = Number(this.consulta());
        const firmada = lista.find((c) => c.id === preelegida && c.firmadaEn);
        if (firmada) {
          this.seleccionadas.set(new Set([firmada.id]));
          if (!this.c.diagnosticoPreoperatorio.value) {
            this.c.diagnosticoPreoperatorio.setValue(firmada.diagnosticoPrincipal);
          }
        }
      },
      error: () => this.error.set('No se pudo cargar el historial del paciente.'),
    });
  }

  protected alternarConsulta(id: number): void {
    const nuevas = new Set(this.seleccionadas());
    if (nuevas.has(id)) nuevas.delete(id);
    else nuevas.add(id);
    this.seleccionadas.set(nuevas);
  }

  ngOnDestroy(): void {
    this.contexto.restablecer();
  }

  protected get c() {
    return this.formulario.controls;
  }

  protected errorDe(campo: keyof typeof this.c, mensaje: string): string {
    const control = this.c[campo];
    return control.invalid && control.touched ? mensaje : '';
  }

  protected guardar(): void {
    if (this.formulario.invalid) {
      this.formulario.markAllAsTouched();
      this.error.set('Complete los campos obligatorios.');
      return;
    }
    if (this.seleccionadas().size === 0) {
      this.error.set('Seleccione al menos una consulta firmada del historial que respalde la cirugía.');
      return;
    }
    const valores = this.formulario.getRawValue();
    if (valores.estado === 'REALIZADA' && !valores.reporteOperatorio.trim()) {
      this.c.reporteOperatorio.markAsTouched();
      this.error.set('Si la cirugía ya se realizó, escriba el reporte operatorio.');
      return;
    }

    this.guardando.set(true);
    this.error.set('');
    this.cirugias
      .crearCirugia({
        pacienteId: Number(valores.pacienteId),
        oftalmologoId: Number(valores.oftalmologoId),
        diagnosticoPreoperatorio: valores.diagnosticoPreoperatorio,
        tipoCirugia: valores.tipoCirugia,
        fecha: valores.fecha,
        lateralidad: valores.lateralidad,
        tipoAnestesia: valores.tipoAnestesia,
        reporteOperatorio: valores.reporteOperatorio,
        estado: valores.estado,
        consultaIds: [...this.seleccionadas()],
      })
      .subscribe({
        next: () => this.router.navigate(['/historial/paciente', valores.pacienteId]),
        error: (fallo) => {
          this.guardando.set(false);
          this.error.set(
            fallo?.error?.message || 'No se pudo guardar el registro quirúrgico. Inténtelo de nuevo.'
          );
        },
      });
  }

  private hoyIso(): string {
    const hoy = new Date();
    const mes = String(hoy.getMonth() + 1).padStart(2, '0');
    const dia = String(hoy.getDate()).padStart(2, '0');
    return `${hoy.getFullYear()}-${mes}-${dia}`;
  }
}