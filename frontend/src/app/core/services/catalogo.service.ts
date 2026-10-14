import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map, of } from 'rxjs';
import { delay } from 'rxjs/operators';

import { environment } from '../../../environments/environment';
import { CatalogoItem } from '../models';
import { DemoDataService } from './demo-data.service';

/**
 * Catálogos de la clínica (tipos de consulta, subespecialidades, tratamientos,
 * exámenes, seguros y sedes). El backend los expone como tablas de catálogo,
 * no como `ENUM` de MySQL, para poder ampliarlos sin migración (RNF-05).
 *
 * <p>Cada lista tiene su propio endpoint: una pantalla que solo necesita las
 * subespecialidades no descarga el resto.
 */
@Injectable({ providedIn: 'root' })
export class CatalogoService {
  private readonly http = inject(HttpClient);
  private readonly demo = inject(DemoDataService);

  private readonly base = `${environment.apiUrl}/catalogo`;

  private cargar(nombre: string): Observable<CatalogoItem[]> {
    if (environment.useMockApi) {
      return of(this.demo.catalogo(nombre)).pipe(delay(60));
    }
    return this.http.get<CatalogoItem[]>(`${this.base}/${nombre}`);
  }

  tiposConsulta(): Observable<CatalogoItem[]> {
    return this.cargar('tipos-consulta');
  }

  subespecialidades(): Observable<CatalogoItem[]> {
    return this.cargar('subespecialidades');
  }

  tiposTratamiento(): Observable<CatalogoItem[]> {
    return this.cargar('tipos-tratamiento');
  }

  tiposExamen(): Observable<CatalogoItem[]> {
    return this.cargar('tipos-examen');
  }

  seguros(): Observable<CatalogoItem[]> {
    return this.cargar('seguros');
  }

  estadosCita(): Observable<CatalogoItem[]> {
    return this.cargar('estados-cita');
  }

  ojos(): Observable<CatalogoItem[]> {
    return this.cargar('ojos');
  }

  diasSemana(): Observable<CatalogoItem[]> {
    return this.cargar('dias-semana');
  }

  /**
   * Sedes disponibles. El catálogo trae las universidades y centros del país
   * cargados por `sql/05_sedes.sql`.
   */
  sedes(): Observable<CatalogoItem[]> {
    return this.cargar('sedes');
  }

  /**
   * Busca una sede por nombre mientras el usuario escribe. El backend filtra de
   * forma parcial y sin distinguir mayúsculas, así que «san marcos» encuentra
   * «Universidad Nacional Mayor de San Marcos (UNMSM)».
   */
  buscarSedes(termino: string): Observable<CatalogoItem[]> {
    const limpio = (termino ?? '').trim();
    if (environment.useMockApi) {
      const todas = this.demo.catalogo('sedes');
      if (!limpio) return of(todas).pipe(delay(60));
      const t = limpio.toLowerCase();
      return of(
        todas.filter((s) => (s.nombre ?? '').toLowerCase().includes(t))
      ).pipe(delay(60));
    }
    const params = new HttpParams().set('q', limpio);
    return this.http
      .get<CatalogoItem[]>(`${this.base}/sedes/buscar`, { params })
      .pipe(map((lista) => lista ?? []));
  }
}