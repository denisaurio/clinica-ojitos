import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { delay } from 'rxjs/operators';

import { environment } from '../../../environments/environment';
import { CatalogoItem } from '../models';
import { DemoDataService } from './demo-data.service';

/**
 * Catálogos de la clínica (tipos de consulta, subespecialidades, tratamientos,
 * exámenes y seguros). El backend los expone como tablas de catálogo, no como
 * `ENUM` de MySQL.
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
}