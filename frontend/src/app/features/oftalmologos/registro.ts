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
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, takeUntil } from 'rxjs/operators';

import { ButtonComponent } from '../../shared/components/ui-button';
import { InputComponent } from '../../shared/components/ui-input';
import { OpcionSelect } from '../../shared/components/ui-select';
import { CardComponent } from '../../shared/components/ui-card';
import { ModalComponent } from '../../shared/components/ui-modal';
import { AlertComponent } from '../../shared/components/ui-alert';
import { IconComponent } from '../../shared/components/ui-icon';
import { OftalmologoService } from '../../core/services/oftalmologo.service';
import { CatalogoService } from '../../core/services/catalogo.service';
import { ContextoPaginaService } from '../../core/services/contexto-pagina.service';
import { Credenciales } from '../../core/models';

/**
 * Alta de oftalmólogo (imagen 39).
 *
 * RF5.2 — el número de colegiatura es único: se comprueba mientras se escribe
 * contra `/oftalmologos/existe-colegiatura`.
 *
 * RF5.3 — la subespecialidad se elige de un catálogo, pero también puede
 * escribirse a mano: todo lo que se teclea se guarda como subespecialidad
 * nueva, sin pedirPermiso al administrador.
 *
 * La sede se busca entre las universidades y centros del país, y admite texto
 * libre cuando el profesionaljerza en un lugar que no está en el catálogo.
 */
@Component({
  selector: 'app-oftalmologo-registro',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    ButtonComponent,
    InputComponent,
    CardComponent,
    AlertComponent,
    IconComponent,
    ModalComponent,
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

  /** Catalogo completo de subespecialidades, para resolver el id al guardar. */
  private readonly catalogoSubespecialidades = signal<{ id: number; nombre: string }[]>([]);
  protected readonly sedes = signal<OpcionSelect[]>([]);

  /** Catalogo completo de sedes, para resolver el id al guardar. */
  private readonly catalogoSedes = signal<{ id: number; nombre: string }[]>([]);
  protected readonly colegiaturaDuplicada = signal(false);
  protected readonly guardando = signal(false);
  protected readonly error = signal('');

  /** Credenciales del primer ingreso; se muestran una sola vez. */
  protected readonly credenciales = signal<Credenciales | null>(null);

  protected readonly formulario = this.fb.nonNullable.group({
    nombres: ['', [Validators.required, Validators.minLength(2)]],
    apellidos: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]],
    telefono: ['', [Validators.required]],
    numeroColegiatura: ['', [Validators.required, Validators.minLength(5)]],
    subespecialidad: ['', [Validators.required]],
    sede: ['', [Validators.required]],
  });

  /** Valor a guardar: lo elegido del catálogo o lo tecleado a mano. */
  protected readonly subespecialidadElegida = computed<string>(() => {
    const lista = this.subespecialidades();
    const escrito = this.formulario.controls.subespecialidad.value.trim();
    if (!escrito) return '';
    const deCatalogo = lista.find((o) => String(o.valor) === escrito);
    return deCatalogo ? String(deCatalogo.valor) : escrito;
  });

  ngOnInit(): void {
    this.contexto.configurar({
      placeholder: '',
      textoEnlace: 'Soporte',
      accion: { texto: 'Nuevo Registro', destino: '/oftalmologos/nuevo', variante: 'primario' },
    });

    this.catalogos.subespecialidades().subscribe({
      next: (items) => {
        const lista = items ?? [];
        this.subespecialidades.set(lista.map((s) => ({ valor: s.nombre, etiqueta: s.nombre })));
        this.catalogoSubespecialidades.set(lista.map((s) => ({ id: s.id, nombre: s.nombre })));
      },
      error: () =>
        this.error.set(
          'No se pudo cargar el catálogo de subespecialidades. ¿Está el backend encendido?'
        ),
    });

    this.cargarSedes('');

    this.formulario.controls.sede.valueChanges
      .pipe(debounceTime(250), distinctUntilChanged(), takeUntil(this.destruido))
      .subscribe((texto) => this.cargarSedes(texto));

    this.formulario.controls.numeroColegiatura.valueChanges
      .pipe(debounceTime(350), distinctUntilChanged(), takeUntil(this.destruido))
      .subscribe((numero) => {
        const control = this.formulario.controls.numeroColegiatura;
        if (numero.trim().length < 5) {
          this.colegiaturaDuplicada.set(false);
          return;
        }
        this.oftalmologos.existeColegiatura(numero).subscribe({
          next: (respuesta) => {
            this.colegiaturaDuplicada.set(respuesta.existe);
            control.setErrors(respuesta.existe ? { duplicada: true } : null);
          },
          error: () => {
            // Si no se puede comprobar, no se bloquea el alta: el backend
            // volverá a validar la unicidad de la colegiatura (RF5.2).
            this.colegiaturaDuplicada.set(false);
            control.setErrors(null);
          },
        });
      });
  }

  private cargarSedes(texto: string): void {
    this.catalogos.buscarSedes(texto).subscribe({
      next: (items) =>
        this.sedes.set(
          (items ?? []).map((s) => ({ valor: s.nombre, etiqueta: s.nombre }))
        ),
      error: () => this.sedes.set([]),
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

  /** Traduce el nombre de la sede elegida al id que espera la API. */
  private idDeSubespecialidad(nombre: string): number | null {
    return this.catalogoSubespecialidades().find((s) => s.nombre === nombre)?.id ?? null;
  }

  private idDeSede(nombre: string): number | null {
    return this.catalogoSedes().find((s) => s.nombre === nombre)?.id ?? null;
  }

  protected guardar(): void {
    if (this.formulario.invalid) {
      this.formulario.markAllAsTouched();
      return;
    }

    this.guardando.set(true);
    this.error.set('');

    const valores = this.formulario.getRawValue();

    this.oftalmologos
      .crear({
        ...valores,
        subespecialidad: this.subespecialidadElegida(),
        subespecialidadId: this.idDeSubespecialidad(this.subespecialidadElegida()),
        sedeId: this.idDeSede(valores.sede),
        sede: valores.sede,
      })
      .subscribe({
        next: (respuesta) => {
          this.guardando.set(false);
          this.credenciales.set(respuesta.credenciales);
          if (!respuesta.credenciales) {
            this.router.navigate(['/oftalmologos']);
          }
        },
        error: (fallo) => {
          this.guardando.set(false);
          const mensaje = fallo?.error?.message;
          this.error.set(
            mensaje ||
              'No se pudo guardar el médico. Revise los datos e inténtelo de nuevo.'
          );
        },
      });
  }

  /** Cierra el aviso de credenciales y vuelve al directorio. */
  protected continuar(): void {
    this.credenciales.set(null);
    this.router.navigate(['/oftalmologos']);
  }

  /** Descarga la credencial como archivo de texto para entregarlo impreso. */
  protected descargarCredenciales(): void {
    const c = this.credenciales();
    if (!c) return;

    const contenido = c.textoParaDescargar;
    const blob = new Blob([contenido], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const enlace = document.createElement('a');
    enlace.href = url;
    enlace.download = `credenciales-${c.username}.txt`;
    enlace.click();
    URL.revokeObjectURL(url);
  }
}
