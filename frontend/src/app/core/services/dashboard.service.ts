import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { delay } from 'rxjs/operators';

import { environment } from '../../../environments/environment';
import {
  DashboardAdmin,
  DashboardMedico,
  DashboardPaciente,
  DashboardRecepcion,
  IntentoAcceso,
  MensajePortal,
  PageResponse,
} from '../models';
import { DemoDataService } from './demo-data.service';

/** Endpoints `/dashboards/*` y `/admin/auditoria` del backend. */
@Injectable({ providedIn: 'root' })
export class DashboardService {
  private readonly http = inject(HttpClient);
  private readonly demo = inject(DemoDataService);

  private readonly base = `${environment.apiUrl}/dashboards`;

  admin(): Observable<DashboardAdmin> {
    if (environment.useMockApi) {
      return of(this.demo.dashboardAdmin).pipe(delay(120));
    }
    return this.http.get<DashboardAdmin>(`${this.base}/admin`);
  }

  medico(): Observable<DashboardMedico> {
    if (environment.useMockApi) {
      return of(this.demo.dashboardMedico).pipe(delay(120));
    }
    return this.http.get<DashboardMedico>(`${this.base}/medico`);
  }

  recepcion(): Observable<DashboardRecepcion> {
    if (environment.useMockApi) {
      return of(this.demo.dashboardRecepcion).pipe(delay(120));
    }
    return this.http.get<DashboardRecepcion>(`${this.base}/recepcion`);
  }

  paciente(): Observable<DashboardPaciente> {
    if (environment.useMockApi) {
      return of(this.demo.dashboardPaciente).pipe(delay(120));
    }
    return this.http.get<DashboardPaciente>(`${this.base}/paciente`);
  }

  mensajes(): Observable<MensajePortal[]> {
    if (environment.useMockApi) {
      return of(this.demo.mensajesPortal).pipe(delay(120));
    }
    return this.http.get<MensajePortal[]>(`${this.base}/paciente/mensajes`);
  }

  auditoria(page: number, size: number): Observable<PageResponse<IntentoAcceso>> {
    if (environment.useMockApi) {
      const todos = this.demo.dashboardAdmin.intentosAcceso;
      const inicio = page * size;
      return of({
        content: todos.slice(inicio, inicio + size),
        totalElements: todos.length,
        totalPages: Math.max(1, Math.ceil(todos.length / size)),
        number: page,
        size,
        first: inicio === 0,
        last: inicio + size >= todos.length,
      }).pipe(delay(100));
    }
    const params = new HttpParams().set('page', page).set('size', size);
    return this.http.get<PageResponse<IntentoAcceso>>(`${environment.apiUrl}/admin/auditoria`, {
      params,
    });
  }
}