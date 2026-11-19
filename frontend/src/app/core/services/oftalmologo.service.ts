import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, forkJoin, of, throwError } from 'rxjs';
import { delay, map } from 'rxjs/operators';

import { environment } from '../../../environments/environment';
import {
  AltaOftalmologo,
  BloqueHorario,
  CatalogoItem,
  Credenciales,
  DiaSemana,
  ExisteColegiaturaResponse,
  HorarioSemanal,
  MetricasOftalmologo,
  Oftalmologo,
  OftalmologoRequest,
  PageResponse,
} from '../models';
import { DemoDataService } from './demo-data.service';

/** Endpoints `/oftalmologos` del backend. */
@Injectable({ providedIn: 'root' })
export class OftalmologoService {
  private readonly http = inject(HttpClient);
  private readonly demo = inject(DemoDataService);

  private readonly base = `${environment.apiUrl}/oftalmologos`;
  private readonly baseCatalogo = `${environment.apiUrl}/catalogo`;

  /** Cachés de catálogos resueltas en `horarios()` y reutilizadas al guardar. */
  private diasPorCodigo = new Map<string, number>();
  private tiposPorCodigo = new Map<string, number>();

  listar(buscar: string, activo: boolean | null): Observable<Oftalmologo[]> {
    if (environment.useMockApi) {
      const termino = buscar.trim().toLowerCase();
      const filtrados = this.demo.oftalmologos.filter(
        (o) =>
          (activo === null || o.activo === activo) &&
          (!termino ||
            o.nombreCompleto.toLowerCase().includes(termino) ||
            o.numeroColegiatura.toLowerCase().includes(termino) ||
            o.subespecialidad.toLowerCase().includes(termino))
      );
      return of(filtrados).pipe(delay(120));
    }

    // El backend pagina el directorio; la pantalla filtra en cliente, así que
    // se pide la primera página con el tamaño máximo permitido.
    let params = new HttpParams().set('page', 0).set('size', 100);
    if (buscar.trim()) params = params.set('buscar', buscar.trim());
    if (activo !== null) params = params.set('activo', activo);

    return this.http.get<PageResponse<Oftalmologo>>(this.base, { params }).pipe(
      map((pagina) => pagina.content ?? [])
    );
  }

  /** GET /oftalmologos/activos: la única lista de médicos que puede pedir un paciente. */
  activos(): Observable<Oftalmologo[]> {
    if (environment.useMockApi) {
      return of(this.demo.oftalmologos.filter((o) => o.activo)).pipe(delay(100));
    }
    return this.http.get<Oftalmologo[]>(`${this.base}/activos`);
  }

  obtener(id: number): Observable<Oftalmologo> {
    if (environment.useMockApi) {
      return of(this.demo.oftalmologos.find((o) => o.id === id) ?? this.demo.oftalmologos[0]).pipe(
        delay(100)
      );
    }
    return this.http.get<Oftalmologo>(`${this.base}/${id}`);
  }

  crear(peticion: OftalmologoRequest): Observable<AltaOftalmologo> {
    if (environment.useMockApi) {
      const nuevo: Oftalmologo = {
        id: this.demo.oftalmologos.length + 1,
        ...peticion,
        nombreCompleto: `Dr. ${peticion.nombres} ${peticion.apellidos}`,
        iniciales: this.demo.iniciales(`${peticion.nombres} ${peticion.apellidos}`),
        activo: true,
        fotoUrl: '',
      };
      return of({
        oftalmologo: nuevo,
        credenciales: {
          username: peticion.email.split('@')[0],
          password: 'Demo9!aZ#2kLq',
          nombreCompleto: nuevo.nombreCompleto,
          textoParaDescargar: 'Credenciales de demostración',
        },
      }).pipe(delay(200));
    }
    return this.http.post<AltaOftalmologo>(this.base, this.aPeticion(peticion, true));
  }

  /**
   * Pide nuevas credenciales para un profesional. La contraseña anterior no es
   * recuperable —solo existe su hash—, así que el backend emite una nueva.
   */
  credenciales(id: number): Observable<Credenciales> {
    if (environment.useMockApi) {
      return of({
        username: `demo${id}`,
        password: 'Demo9!aZ#2kLq',
        nombreCompleto: 'Oftalmólogo de demostración',
        textoParaDescargar: 'Credenciales de demostración',
      }).pipe(delay(150));
    }
    return this.http.post<Credenciales>(`${this.base}/${id}/credenciales`, {});
  }

  /** El backend guarda `subespecialidad` como id de catálogo, no como texto. */
  private aPeticion(p: OftalmologoRequest, activo?: boolean) {
    return {
      nombres: p.nombres,
      apellidos: p.apellidos,
      email: p.email,
      telefono: p.telefono,
      numeroColegiatura: p.numeroColegiatura,
      subespecialidadId: p.subespecialidadId ?? null,
      subespecialidad: p.subespecialidad || null,
      sedeId: p.sedeId ?? null,
      sede: p.sede || null,
      // Sin valor explícito no se envía: editar a un médico desactivado no lo
      // reactiva (antes se mandaba siempre true).
      ...(activo === undefined ? {} : { activo }),
    };
  }

  /** `activo` solo se envía cuando se quiere cambiar (reactivar); al editar se omite. */
  actualizar(id: number, peticion: OftalmologoRequest, activo?: boolean): Observable<Oftalmologo> {
    if (environment.useMockApi) {
      const actual = this.demo.oftalmologos.find((o) => o.id === id);
      return of({ ...actual!, ...peticion, ...(activo === undefined ? {} : { activo }) }).pipe(delay(180));
    }
    return this.http.put<Oftalmologo>(`${this.base}/${id}`, this.aPeticion(peticion, activo));
  }

  desactivar(id: number): Observable<Oftalmologo> {
    if (environment.useMockApi) {
      const actual = this.demo.oftalmologos.find((o) => o.id === id);
      return of({ ...actual!, activo: false }).pipe(delay(150));
    }
    return this.http.patch<Oftalmologo>(`${this.base}/${id}/desactivar`, {});
  }

  /** RF5.2 — el número de colegiatura es único. */
  existeColegiatura(numeroColegiatura: string): Observable<ExisteColegiaturaResponse> {
    if (environment.useMockApi) {
      const existe = this.demo.oftalmologos.some(
        (o) => o.numeroColegiatura.toLowerCase() === numeroColegiatura.trim().toLowerCase()
      );
      return of({ existe }).pipe(delay(180));
    }
    const params = new HttpParams().set('numero', numeroColegiatura);
    return this.http.get<ExisteColegiaturaResponse>(`${this.base}/existe-colegiatura`, { params });
  }

  horarios(id: number): Observable<HorarioSemanal> {
    if (environment.useMockApi) {
      return of({ bloques: this.demo.horariosPorOftalmologo[id] ?? this.demo.horarios }).pipe(
        delay(100)
      );
    }

    // Los catálogos permiten traducir los ids al modelo de la matriz y de
    // vuelta al guardar. `forkJoin` los pide en paralelo.
    return forkJoin({
      horarios: this.http.get<HorarioApi[]>(`${this.base}/${id}/horarios`),
      dias: this.http.get<CatalogoItem[]>(`${this.baseCatalogo}/dias-semana`),
      tipos: this.http.get<CatalogoItem[]>(`${this.baseCatalogo}/tipos-bloque`),
    }).pipe(
      map(({ horarios, dias, tipos }) => {
        this.diasPorCodigo = this.porCodigo(dias);
        this.tiposPorCodigo = this.porCodigo(tipos);
        return { bloques: (horarios ?? []).map((h) => this.aBloque(h)) };
      })
    );
  }

  guardarHorarios(id: number, bloques: BloqueHorario[]): Observable<HorarioSemanal> {
    if (environment.useMockApi) {
      return of({ bloques }).pipe(delay(180));
    }

    const horarios = [];
    for (const bloque of bloques) {
      const diaSemanaId =
        bloque.diaSemanaId ?? this.diasPorCodigo.get(this.codigoDia(bloque.dia));
      const tipoBloqueId =
        bloque.tipoBloqueId ?? this.tiposPorCodigo.get(this.codigoTipo(bloque.tipo));

      if (!diaSemanaId || !tipoBloqueId) {
        return throwError(
          () => new Error('No se pudieron resolver los catálogos de días y tipos de bloque.')
        );
      }

      horarios.push({
        diaSemanaId,
        horaInicio: bloque.horaInicio.slice(0, 5),
        horaFin: bloque.horaFin.slice(0, 5),
        tipoBloqueId,
        sedeId: bloque.sedeId ?? null,
        activo: bloque.activo ?? true,
      });
    }

    return this.http
      .put<HorarioApi[]>(`${this.base}/${id}/horarios`, { horarios })
      .pipe(map((lista) => ({ bloques: (lista ?? []).map((h) => this.aBloque(h)) })));
  }

  metricas(id: number): Observable<MetricasOftalmologo> {
    if (environment.useMockApi) {
      return of(
        this.demo.metricasPorOftalmologo[id] ?? {
          pacientesAtendidos: 0,
          citasSemana: 0,
          horasSemanales: 0,
          cirugiasRealizadas: 0,
          valoracionMedia: null,
        }
      ).pipe(delay(100));
    }
    return this.http.get<MetricasApi>(`${this.base}/${id}/metricas`).pipe(
      map((m) => ({
        pacientesAtendidos: m.pacientesAtendidos ?? 0,
        citasSemana: m.citasSemana ?? 0,
        horasSemanales: m.horasSemanales ?? 0,
        cirugiasRealizadas: m.cirugiasRealizadas ?? 0,
        valoracionMedia: m.satisfaccionMedia ?? null,
      }))
    );
  }

  // ---------------------------------------------------------- Adaptadores

  private aBloque(h: HorarioApi): BloqueHorario {
    const codigoDia = h.diaSemanaCodigo ?? this.codigoDeNombre(h.diaSemana ?? '');
    return {
      diaSemanaId: h.diaSemanaId,
      dia: this.diaDesdeCodigo(codigoDia),
      horaInicio: (h.horaInicio ?? '').slice(0, 5),
      horaFin: (h.horaFin ?? '').slice(0, 5),
      tipoBloqueId: h.tipoBloqueId,
      tipo:
        h.tipoBloqueCodigo === 'CIRUGIA'
          ? 'QUIRURGICO'
          : h.tipoBloqueCodigo === 'DESCANSO'
            ? 'DESCANSO'
            : 'DISPONIBLE',
      sedeId: h.sedeId ?? null,
      activo: h.activo ?? true,
    };
  }

  private porCodigo(items: CatalogoItem[]): Map<string, number> {
    return new Map(items.filter((i) => i.codigo).map((i) => [i.codigo, i.id]));
  }

  private codigoDia(dia: DiaSemana): string {
    return (
      {
        LUNES: 'LUN',
        MARTES: 'MAR',
        MIERCOLES: 'MIE',
        JUEVES: 'JUE',
        VIERNES: 'VIE',
        SABADO: 'SAB',
        DOMINGO: 'DOM',
      } as Record<DiaSemana, string>
    )[dia];
  }

  private codigoDeNombre(nombre: string): string {
    const limpio = nombre
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toUpperCase();
    const dias: Record<string, string> = {
      LUNES: 'LUN',
      MARTES: 'MAR',
      MIERCOLES: 'MIE',
      JUEVES: 'JUE',
      VIERNES: 'VIE',
      SABADO: 'SAB',
      DOMINGO: 'DOM',
    };
    return dias[limpio] ?? limpio.slice(0, 3);
  }

  private diaDesdeCodigo(codigo: string): DiaSemana {
    return (
      {
        LUN: 'LUNES',
        MAR: 'MARTES',
        MIE: 'MIERCOLES',
        JUE: 'JUEVES',
        VIE: 'VIERNES',
        SAB: 'SABADO',
        DOM: 'DOMINGO',
      } as Record<string, DiaSemana>
    )[codigo] ?? 'LUNES';
  }

  private codigoTipo(tipo: BloqueHorario['tipo']): string {
    return tipo === 'QUIRURGICO' ? 'CIRUGIA' : tipo === 'DESCANSO' ? 'DESCANSO' : 'CONSULTA';
  }
}

// ------------------------- Formas reales de la respuesta del backend -------

interface HorarioApi {
  id: number;
  diaSemanaId?: number;
  diaSemana?: string;
  diaSemanaCodigo?: string;
  horaInicio: string;
  horaFin: string;
  tipoBloqueId?: number;
  tipoBloque?: string;
  tipoBloqueCodigo?: string;
  sedeId?: number;
  activo?: boolean;
}

interface MetricasApi {
  pacientesAtendidos?: number;
  citasSemana?: number;
  horasSemanales?: number;
  cirugiasRealizadas?: number;
  satisfaccionMedia?: number | null;
}
