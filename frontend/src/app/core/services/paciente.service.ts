import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { delay } from 'rxjs/operators';

import { environment } from '../../../environments/environment';
import {
  ActividadReciente,
  ExisteDocumentoResponse,
  PageResponse,
  Paciente,
  PacienteRequest,
} from '../models';
import { DemoDataService } from './demo-data.service';

/** Endpoints `/pacientes` del backend. */
@Injectable({ providedIn: 'root' })
export class PacienteService {
  private readonly http = inject(HttpClient);
  private readonly demo = inject(DemoDataService);

  private readonly base = `${environment.apiUrl}/pacientes`;

  listar(buscar: string, page: number, size: number): Observable<PageResponse<Paciente>> {
    if (environment.useMockApi) {
      const termino = buscar.trim().toLowerCase();
      const filtrados = termino
        ? this.demo.pacientes.filter(
            (p) =>
              p.nombreCompleto.toLowerCase().includes(termino) ||
              p.documento.toLowerCase().includes(termino)
          )
        : this.demo.pacientes;
      const inicio = page * size;
      return of({
        content: filtrados.slice(inicio, inicio + size),
        totalElements: filtrados.length,
        totalPages: Math.max(1, Math.ceil(filtrados.length / size)),
        number: page,
        size,
        first: inicio === 0,
        last: inicio + size >= filtrados.length,
      }).pipe(delay(120));
    }

    const params = new HttpParams()
      .set('buscar', buscar)
      .set('page', page)
      .set('size', size);
    return this.http.get<PageResponse<Paciente>>(this.base, { params });
  }

  obtener(id: number): Observable<Paciente> {
    if (environment.useMockApi) {
      return of(this.demo.pacientes.find((p) => p.id === id) ?? this.demo.pacientes[0]).pipe(
        delay(100)
      );
    }
    return this.http.get<Paciente>(`${this.base}/${id}`);
  }

  crear(peticion: PacienteRequest): Observable<Paciente> {
    if (environment.useMockApi) {
      return of(this.construir(peticion, this.demo.pacientes.length + 1)).pipe(delay(150));
    }
    return this.http.post<Paciente>(this.base, peticion);
  }

  actualizar(id: number, peticion: PacienteRequest): Observable<Paciente> {
    if (environment.useMockApi) {
      return of(this.construir(peticion, id)).pipe(delay(150));
    }
    return this.http.put<Paciente>(`${this.base}/${id}`, peticion);
  }

  /** Baja lógica: el historial clínico nunca se borra (AGENTS.md §3.1). */
  eliminar(id: number): Observable<void> {
    if (environment.useMockApi) {
      return of(undefined).pipe(delay(120));
    }
    return this.http.delete<void>(`${this.base}/${id}`);
  }

  existeDocumento(documento: string): Observable<ExisteDocumentoResponse> {
    if (environment.useMockApi) {
      const existe = this.demo.pacientes.some(
        (p) => p.documento.toLowerCase() === documento.trim().toLowerCase()
      );
      return of({ existe }).pipe(delay(180));
    }
    const params = new HttpParams().set('documento', documento);
    return this.http.get<ExisteDocumentoResponse>(`${this.base}/existe-documento`, { params });
  }

  actividadReciente(id: number): Observable<ActividadReciente[]> {
    if (environment.useMockApi) {
      return of(this.demo.actividadReciente[id] ?? []).pipe(delay(100));
    }
    return this.http.get<ActividadReciente[]>(`${this.base}/${id}/actividad-reciente`);
  }

  private construir(peticion: PacienteRequest, id: number): Paciente {
    return {
      id,
      nombres: peticion.nombres,
      apellidos: peticion.apellidos,
      nombreCompleto: `${peticion.nombres} ${peticion.apellidos}`,
      documento: peticion.documento,
      fechaNacimiento: peticion.fechaNacimiento,
      edad: this.edadDesde(peticion.fechaNacimiento),
      telefono: peticion.telefono,
      email: peticion.email,
      direccion: peticion.direccion,
      seguro: peticion.seguro,
      grupoSanguineo: peticion.grupoSanguineo,
      antecedentesOculares: peticion.antecedentesOculares,
      alergias: peticion.alergias,
      activo: true,
      fechaRegistro: new Date().toISOString().slice(0, 10),
    };
  }

  private edadDesde(fechaNacimiento: string): number {
    if (!fechaNacimiento) {
      return 0;
    }
    const nacimiento = new Date(fechaNacimiento);
    const hoy = new Date();
    let edad = hoy.getFullYear() - nacimiento.getFullYear();
    const mes = hoy.getMonth() - nacimiento.getMonth();
    if (mes < 0 || (mes === 0 && hoy.getDate() < nacimiento.getDate())) {
      edad -= 1;
    }
    return edad;
  }
}