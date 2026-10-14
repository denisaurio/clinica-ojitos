import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { delay } from 'rxjs/operators';

import { environment } from '../../../environments/environment';
import {
  AltaOftalmologo,
  BloqueHorario,
  Credenciales,
  ExisteColegiaturaResponse,
  HorarioSemanal,
  MetricasOftalmologo,
  Oftalmologo,
  OftalmologoRequest,
} from '../models';
import { DemoDataService } from './demo-data.service';

/** Endpoints `/oftalmologos` del backend. */
@Injectable({ providedIn: 'root' })
export class OftalmologoService {
  private readonly http = inject(HttpClient);
  private readonly demo = inject(DemoDataService);

  private readonly base = `${environment.apiUrl}/oftalmologos`;

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
    let params = new HttpParams().set('buscar', buscar);
    if (activo !== null) {
      params = params.set('activo', activo);
    }
    return this.http.get<Oftalmologo[]>(this.base, { params });
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
    return this.http.post<AltaOftalmologo>(this.base, this.aPeticion(peticion));
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
  private aPeticion(p: OftalmologoRequest) {
    return {
      nombres: p.nombres,
      apellidos: p.apellidos,
      email: p.email,
      telefono: p.telefono,
      numeroColegiatura: p.numeroColegiatura,
      subespecialidadId: p.subespecialidadId ?? null,
      sedeId: p.sedeId ?? null,
      activo: true,
    };
  }

  actualizar(id: number, peticion: OftalmologoRequest): Observable<Oftalmologo> {
    if (environment.useMockApi) {
      const actual = this.demo.oftalmologos.find((o) => o.id === id);
      return of({ ...actual!, ...peticion }).pipe(delay(180));
    }
    return this.http.put<Oftalmologo>(`${this.base}/${id}`, peticion);
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
    const params = new HttpParams().set('numeroColegiatura', numeroColegiatura);
    return this.http.get<ExisteColegiaturaResponse>(`${this.base}/existe-colegiatura`, { params });
  }

  horarios(id: number): Observable<HorarioSemanal> {
    if (environment.useMockApi) {
      return of({ bloques: this.demo.horariosPorOftalmologo[id] ?? this.demo.horarios }).pipe(
        delay(100)
      );
    }
    return this.http.get<HorarioSemanal>(`${this.base}/${id}/horarios`);
  }

  guardarHorarios(id: number, bloques: BloqueHorario[]): Observable<HorarioSemanal> {
    if (environment.useMockApi) {
      return of({ bloques }).pipe(delay(180));
    }
    return this.http.put<HorarioSemanal>(`${this.base}/${id}/horarios`, { bloques });
  }

  metricas(id: number): Observable<MetricasOftalmologo> {
    if (environment.useMockApi) {
      return of(
        this.demo.metricasPorOftalmologo[id] ?? {
          pacientesAtendidos: 0,
          citasSemana: 0,
          valoracionMedia: 0,
        }
      ).pipe(delay(100));
    }
    return this.http.get<MetricasOftalmologo>(`${this.base}/${id}/metricas`);
  }
}