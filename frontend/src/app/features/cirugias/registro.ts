import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  OnInit,
  inject,
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
import { CatalogoService } from '../../core/services/catalogo.service';
import { ContextoPaginaService } from '../../core/services/contexto-pagina.service';
import { DemoDataService } from '../../core/services/demo-data.service';
import { Lateralidad } from '../../core/models';

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
  private readonly catalogos = inject(CatalogoService);
  private readonly demo = inject(DemoDataService);
  private readonly router = inject(Router);
  private readonly contexto = inject(ContextoPaginaService);

  protected readonly tiposCirugia: OpcionSelect[] = this.demo.tiposCirugia.map((t) => ({
    valor: t,
    etiqueta: t,
  }));

  protected readonly anestesias: OpcionSelect[] = [
    'Tópica', 'Peribulbar', 'Retrobulbar', 'General'
  ].map((a) => ({ valor: a, etiqueta: a }));

  protected readonly tiposExamen = signal<OpcionSelect[]>([]);

  protected readonly guardando = signal(false);
  protected readonly error = signal('');

  protected readonly formulario = this.fb.nonNullable.group({
    pacienteId: [0, [Validators.required]],
    diagnosticoPreoperatorio: ['', [Validators.required]],
    tipoCirugia: ['', [Validators.required]],
    fecha: ['', [Validators.required]],
    lateralidad: ['OD' as Lateralidad, [Validators.required]],
    tipoAnestesia: ['Tópica', [Validators.required]],
    reporteOperatorio: ['', [Validators.required]],
  });

  ngOnInit(): void {
    this.contexto.configurar({
      placeholder: '',
      antetitulo: 'CIRUGÍAS > Nuevo Registro',
    });

    this.catalogos
      .tiposExamen()
      .subscribe((items) => this.tiposExamen.set(items.map((i) => ({ valor: i.nombre, etiqueta: i.nombre }))));
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
      return;
    }

    this.guardando.set(true);
    this.cirugias.crearCirugia(this.formulario.getRawValue()).subscribe({
      next: () => this.router.navigate(['/dashboard']),
      error: () => {
        this.guardando.set(false);
        this.error.set('No se pudo guardar el registro quirúrgico. Inténtelo de nuevo.');
      },
    });
  }
}