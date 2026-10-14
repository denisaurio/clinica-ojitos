import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';

import { ButtonComponent } from '../../shared/components/ui-button';
import { InputComponent } from '../../shared/components/ui-input';
import { SelectComponent, OpcionSelect } from '../../shared/components/ui-select';
import { CardComponent } from '../../shared/components/ui-card';
import { AlertComponent } from '../../shared/components/ui-alert';
import { IconComponent } from '../../shared/components/ui-icon';
import { CatalogoService } from '../../core/services/catalogo.service';
import { HistorialService } from '../../core/services/historial.service';
import { ContextoPaginaService } from '../../core/services/contexto-pagina.service';
import { DemoDataService } from '../../core/services/demo-data.service';
import { ConsultaRequest } from '../../core/models';

interface ArchivoAdjunto {
  nombre: string;
  url: string;
}

/**
 * Nueva consulta oftalmológica (imagen 29): evaluación visual por ojo, notas
 * SOAP y carga de exámenes.
 *
 * El sistema registra lo que el profesional indica; no calcula dosis ni sugiere
 * tratamientos (AGENTS.md §4).
 */
@Component({
  selector: 'app-nueva-consulta',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    ButtonComponent,
    InputComponent,
    SelectComponent,
    CardComponent,
    AlertComponent,
    IconComponent,
  ],
  templateUrl: './nueva-consulta.html',
  styleUrl: './nueva-consulta.scss',
})
export class NuevaConsultaComponent implements OnInit, OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly historial = inject(HistorialService);
  private readonly catalogos = inject(CatalogoService);
  private readonly demo = inject(DemoDataService);
  private readonly ruta = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly contexto = inject(ContextoPaginaService);

  protected readonly pacienteId = signal(5);
  protected readonly pacienteNombre = signal('Sarah Jenkins');
  protected readonly guardando = signal(false);
  protected readonly error = signal('');

  /** Escala Snellen: AGENTS.md prohíbe inventar escalas no estandarizadas. */
  protected readonly agudezas: OpcionSelect[] = this.demo.escalaAgudeza.map((a) => ({
    valor: a,
    etiqueta: a,
  }));

  protected readonly tiposConsulta = signal<OpcionSelect[]>([]);
  protected readonly archivos = signal<ArchivoAdjunto[]>([
    { nombre: 'fondo_OD_2023.jpg', url: '' },
    { nombre: 'OCT_Scan_Report.pdf', url: '' },
  ]);

  protected readonly formulario = this.fb.nonNullable.group({
    tipoConsulta: ['', [Validators.required]],
    motivo: ['', [Validators.required]],
    agudezaOd: [''],
    agudezaOi: [''],
    pioOd: [null as number | null, [Validators.min(10), Validators.max(40)]],
    pioOi: [null as number | null, [Validators.min(10), Validators.max(40)]],
    pupilas: [''],
    biomicroscopia: [''],
    fondoOjo: [''],
    notasSubjectivo: [''],
    notasObjetivo: [''],
    notasEvaluacion: [''],
    notasPlan: [''],
    diagnosticoPrincipal: ['', [Validators.required]],
  });

  ngOnInit(): void {
    this.contexto.configurar({ placeholder: '' });

    const id = this.ruta.snapshot.queryParamMap.get('id');
    if (id) {
      this.pacienteId.set(Number(id));
    }

    this.catalogos
      .tiposConsulta()
      .subscribe((items) =>
        this.tiposConsulta.set(items.map((i) => ({ valor: i.nombre, etiqueta: i.nombre })))
      );
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

  protected alElegirArchivos(evento: Event): void {
    const ficheros = Array.from((evento.target as HTMLInputElement).files ?? []);
    if (ficheros.length === 0) {
      return;
    }
    this.archivos.update((previos) => [
      ...previos,
      ...ficheros.map((f) => ({ nombre: f.name, url: '' })),
    ]);
  }

  protected quitarArchivo(indice: number): void {
    this.archivos.update((previos) => previos.filter((_, i) => i !== indice));
  }

  protected cancelar(): void {
    this.router.navigate(['/historial/paciente', this.pacienteId()]);
  }

  /** Vista previa en vivo de la nota SOAP; evita dos controles sobre el mismo campo. */
  protected readonly resumenSoap = computed(() => {
    const valores = this.formulario.getRawValue();
    return (
      [
        valores.notasSubjectivo && `S — Subjetivo: ${valores.notasSubjectivo}`,
        valores.notasObjetivo && `O — Objetivo: ${valores.notasObjetivo}`,
        valores.notasEvaluacion && `E — Evaluación: ${valores.notasEvaluacion}`,
        valores.notasPlan && `P — Plan: ${valores.notasPlan}`,
      ]
        .filter(Boolean)
        .join('\n\n')
    );
  });

  protected guardar(): void {
    if (this.formulario.invalid) {
      this.formulario.markAllAsTouched();
      return;
    }

    this.guardando.set(true);
    this.error.set('');

    const valores = this.formulario.getRawValue();
    const peticion: ConsultaRequest = {
      pacienteId: this.pacienteId(),
      motivo: valores.motivo,
      tipoConsulta: valores.tipoConsulta,
      diagnosticoPrincipal: valores.diagnosticoPrincipal,
      agudezaOd: valores.agudezaOd,
      agudezaOi: valores.agudezaOi,
      pioOd: valores.pioOd ?? 0,
      pioOi: valores.pioOi ?? 0,
      pupilas: valores.pupilas,
      biomicroscopia: valores.biomicroscopia,
      fondoOjo: valores.fondoOjo,
      notasSubjectivo: valores.notasSubjectivo,
      notasObjetivo: valores.notasObjetivo,
      notasEvaluacion: valores.notasEvaluacion,
      notasPlan: valores.notasPlan,
    };

    this.historial.crear(peticion).subscribe({
      next: () => this.cancelar(),
      error: () => {
        this.guardando.set(false);
        this.error.set('No se pudo guardar la consulta. Inténtelo de nuevo.');
      },
    });
  }
}