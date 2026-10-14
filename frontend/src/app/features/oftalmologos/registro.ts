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
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, takeUntil } from 'rxjs/operators';

import { ButtonComponent } from '../../shared/components/ui-button';
import { InputComponent } from '../../shared/components/ui-input';
import { SelectComponent, OpcionSelect } from '../../shared/components/ui-select';
import { CardComponent } from '../../shared/components/ui-card';
import { AlertComponent } from '../../shared/components/ui-alert';
import { OftalmologoService } from '../../core/services/oftalmologo.service';
import { CatalogoService } from '../../core/services/catalogo.service';
import { ContextoPaginaService } from '../../core/services/contexto-pagina.service';

/**
 * Alta de oftalmólogo (imagen 39).
 *
 * RF5.2 — el número de colegiatura es único: se comprueba mientras se escribe
 * contra `/oftalmologos/existe-colegiatura`.
 */
@Component({
  selector: 'app-oftalmologo-registro',
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
export class OftalmologoRegistroComponent implements OnInit, OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly oftalmologos = inject(OftalmologoService);
  private readonly catalogos = inject(CatalogoService);
  private readonly router = inject(Router);
  private readonly contexto = inject(ContextoPaginaService);

  private readonly destruido = new Subject<void>();

  protected readonly subespecialidades = signal<OpcionSelect[]>([]);
  protected readonly colegiaturaDuplicada = signal(false);
  protected readonly guardando = signal(false);
  protected readonly error = signal('');

  protected readonly formulario = this.fb.nonNullable.group({
    nombres: ['', [Validators.required, Validators.minLength(2)]],
    apellidos: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]],
    telefono: ['', [Validators.required]],
    numeroColegiatura: ['', [Validators.required, Validators.minLength(5)]],
    subespecialidad: ['', [Validators.required]],
    sede: ['Clínica Principal (Centre)'],
  });

  ngOnInit(): void {
    this.contexto.configurar({
      placeholder: '',
      textoEnlace: 'Soporte',
      accion: { texto: 'Nuevo Registro', destino: '/oftalmologos/nuevo', variante: 'primario' },
    });

    this.catalogos.subespecialidades().subscribe((items) => {
      this.subespecialidades.set(items.map((s) => ({ valor: s.nombre, etiqueta: s.nombre })));
    });

    this.formulario.controls.numeroColegiatura.valueChanges
      .pipe(debounceTime(350), distinctUntilChanged(), takeUntil(this.destruido))
      .subscribe((numero) => {
        const control = this.formulario.controls.numeroColegiatura;
        if (numero.trim().length < 5) {
          this.colegiaturaDuplicada.set(false);
          return;
        }
        this.oftalmologos.existeColegiatura(numero).subscribe((respuesta) => {
          this.colegiaturaDuplicada.set(respuesta.existe);
          control.setErrors(respuesta.existe ? { duplicada: true } : null);
        });
      });
  }

  ngOnDestroy(): void {
    this.destruido.next();
    this.destruido.complete();
    this.contexto.restablecer();
  }

  protected get c() {
    return this.formulario.controls;
  }

  protected errorDe(campo: keyof typeof this.c, mensaje: string): string {
    const control = this.c[campo];
    return control.invalid && control.touched ? mensaje : '';
  }

  protected errorColegiatura(): string {
    const control = this.c.numeroColegiatura;
    if (!control.invalid || !control.touched) {
      return '';
    }
    if (this.colegiaturaDuplicada()) {
      return 'Este número de colegiatura ya está registrado';
    }
    return control.hasError('minlength')
      ? 'El número de colegiatura es demasiado corto.'
      : 'El número de colegiatura es obligatorio.';
  }

  protected guardar(): void {
    if (this.formulario.invalid) {
      this.formulario.markAllAsTouched();
      return;
    }

    this.guardando.set(true);
    this.oftalmologos.crear(this.formulario.getRawValue()).subscribe({
      next: () => this.router.navigate(['/oftalmologos']),
      error: () => {
        this.guardando.set(false);
        this.error.set('No se pudo guardar el médico. Revise los datos e inténtelo de nuevo.');
      },
    });
  }
}