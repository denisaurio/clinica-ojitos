import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { delay, map } from 'rxjs/operators';

import { environment } from '../../../environments/environment';
import {
  Cita,
  CitaRequest,
  EstadoCita,
  EstadoRequest,
  EventoAgenda,
  ReprogramarRequest,
  SlotDisponibilidad,
} from '../models';
import { DemoDataService } from './demo-data.service';

/** Endpoints `/citas` del backend. */
@Injectable({ providedIn: 'root' })
export class CitaService {
  private readonly http = inject(HttpClient);
  private readonly demo = inject(DemoDataService);

  private readonly base = `${environment.apiUrl}/citas`;

  listar(fechaDesde: string, fechaHasta: string, oftalmologoId?: number): Observable<Cita[]> {
    if (environment.useMockApi) {
      const filtradas = this.demo.citas.filter(
        (c) =>
          (!oftalmologoId || c.oftalmologoId === oftalmologoId) &&
          (!fechaDesde || c.fecha >= fechaDesde) &&
          (!fechaHasta || c.fecha <= fechaHasta)
      );
      return of(filtradas).pipe(delay(120));
    }
    let params = new HttpParams().set('fechaDesde', fechaDesde).set('fechaHasta', fechaHasta);
    if (oftalmologoId) {
      params = params.set('oftalmologoId', oftalmologoId);
    }
    return this.http.get<Cita[]>(this.base, { params });
  }

  obtener(id: number): Observable<Cita> {
    if (environment.useMockApi) {
      return of(this.demo.citas.find((c) => c.id === id) ?? this.demo.citas[0]).pipe(delay(80));
    }
    return this.http.get<Cita>(`${this.base}/${id}`);
  }

  crear(peticion: CitaRequest): Observable<Cita> {
    if (environment.useMockApi) {
      return of(this.construir(peticion)).pipe(delay(200));
    }
    return this.http.post<Cita>(this.base, peticion);
  }

  reprogramar(id: number, peticion: ReprogramarRequest): Observable<Cita> {
    if (environment.useMockApi) {
      return of({ ...this.demo.citas.find((c) => c.id === id)!, ...peticion } as Cita).pipe(
        delay(180)
      );
    }
    return this.http.patch<Cita>(`${this.base}/${id}/reprogramar`, peticion);
  }

  cancelar(id: number, motivo: string): Observable<Cita> {
    if (environment.useMockApi) {
      const cita = this.demo.citas.find((c) => c.id === id);
      return of({ ...cita!, estadoCita: 'CANCELADA' as EstadoCita, motivoCancelacion: motivo }).pipe(
        delay(150)
      );
    }
    return this.http.patch<Cita>(`${this.base}/${id}/cancelar`, { motivo });
  }

  cambiarEstado(id: number, estado: EstadoRequest): Observable<Cita> {
    if (environment.useMockApi) {
      const cita = this.demo.citas.find((c) => c.id === id);
      return of({ ...cita!, estadoCita: estado.estado }).pipe(delay(120));
    }
    return this.http.patch<Cita>(`${this.base}/${id}/estado`, estado);
  }

  agenda(
    oftalmologoId: number | undefined,
    fechaDesde: string,
    fechaHasta: string
  ): Observable<EventoAgenda[]> {
    if (environment.useMockApi) {
      const eventos = this.demo.eventosAgenda.filter(
        (e) => e.fecha >= fechaDesde && e.fecha <= fechaHasta
      );
      return of(eventos).pipe(delay(120));
    }
    let params = new HttpParams().set('fechaDesde', fechaDesde).set('fechaHasta', fechaHasta);
    if (oftalmologoId) {
      params = params.set('oftalmologoId', oftalmologoId);
    }
    return this.http.get<EventoAgenda[]>(`${this.base}/agenda`, { params });
  }

  disponibilidad(oftalmologoId: number | undefined, fecha: string): Observable<SlotDisponibilidad[]> {
    if (environment.useMockApi) {
      return of(this.demo.disponibilidadDe(fecha)).pipe(delay(140));
    }
    let params = new HttpParams().set('fecha', fecha);
    if (oftalmologoId) {
      params = params.set('oftalmologoId', oftalmologoId);
    }
    return this.http
      .get<SlotDisponibilidad[]>(`${this.base}/disponibilidad`, { params })
      .pipe(map((slots) => slots ?? []));
  }

  private construir(peticion: CitaRequest): Cita {
    const pacientes = this.demo.pacientes;
    const paciente = pacientes.find((p) => p.id === peticion.pacienteId);
    const medico = this.demo.oftalmologos.find((o) => o.id === peticion.oftalmologoId);
    return {
      id: Date.now(),
      pacienteId: peticion.pacienteId,
      pacienteNombre: paciente?.nombreCompleto ?? '',
      documentoPaciente: paciente?.documento ?? '',
      telefonoPaciente: paciente?.telefono ?? '',
      oftalmologoId: peticion.oftalmologoId,
      oftalmologoNombre: medico?.nombreCompleto ?? '',
      fecha: peticion.fecha,
      horaInicio: peticion.horaInicio,
      horaFin: peticion.horaFin,
      tipoConsulta: peticion.tipoConsulta,
      motivo: peticion.motivo,
      estadoCita: 'CONFIRMADA',
      notas: peticion.notas,
      motivoCancelacion: '',
    };
  }
}