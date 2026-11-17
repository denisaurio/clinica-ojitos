import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { delay, map, tap } from 'rxjs/operators';

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

  /** Última cita creada; la pantalla de confirmación la lee de aquí. */
  readonly ultimaCita = signal<Cita | null>(null);

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

    // El backend espera `desde`/`hasta`; las fechas vacías se omiten.
    let params = new HttpParams();
    if (fechaDesde) params = params.set('desde', fechaDesde);
    if (fechaHasta) params = params.set('hasta', fechaHasta);
    if (oftalmologoId) params = params.set('oftalmologoId', oftalmologoId);

    return this.http
      .get<CitaApi[]>(this.base, { params })
      .pipe(map((lista) => (lista ?? []).map((c) => this.aCita(c))));
  }

  obtener(id: number): Observable<Cita> {
    if (environment.useMockApi) {
      return of(this.demo.citas.find((c) => c.id === id) ?? this.demo.citas[0]).pipe(delay(80));
    }
    return this.http.get<CitaApi>(`${this.base}/${id}`).pipe(map((c) => this.aCita(c)));
  }

  crear(peticion: CitaRequest): Observable<Cita> {
    if (environment.useMockApi) {
      const cita = this.construir(peticion);
      this.ultimaCita.set(cita);
      return of(cita).pipe(delay(200));
    }

    const cuerpo = {
      pacienteId: peticion.pacienteId,
      oftalmologoId: peticion.oftalmologoId,
      fecha: peticion.fecha,
      horaInicio: peticion.horaInicio,
      horaFin: peticion.horaFin,
      tipoConsultaId: peticion.tipoConsultaId,
      motivo: peticion.motivo || null,
      notaInterna: peticion.notaInterna || null,
    };

    return this.http.post<CitaApi>(this.base, cuerpo).pipe(
      map((c) => this.aCita(c)),
      tap((c) => this.ultimaCita.set(c))
    );
  }

  reprogramar(id: number, peticion: ReprogramarRequest): Observable<Cita> {
    if (environment.useMockApi) {
      return of({ ...this.demo.citas.find((c) => c.id === id)!, ...peticion } as Cita).pipe(
        delay(180)
      );
    }
    return this.http
      .patch<CitaApi>(`${this.base}/${id}/reprogramar`, peticion)
      .pipe(map((c) => this.aCita(c)));
  }

  cancelar(id: number, motivo: string): Observable<Cita> {
    if (environment.useMockApi) {
      const cita = this.demo.citas.find((c) => c.id === id);
      return of({ ...cita!, estadoCita: 'CANCELADA' as EstadoCita, motivoCancelacion: motivo }).pipe(
        delay(150)
      );
    }
    return this.http
      .patch<CitaApi>(`${this.base}/${id}/cancelar`, { motivo })
      .pipe(map((c) => this.aCita(c)));
  }

  cambiarEstado(id: number, estado: EstadoRequest): Observable<Cita> {
    if (environment.useMockApi) {
      const cita = this.demo.citas.find((c) => c.id === id);
      return of({ ...cita!, estadoCita: estado.estado }).pipe(delay(120));
    }
    return this.http
      .patch<CitaApi>(`${this.base}/${id}/estado`, estado)
      .pipe(map((c) => this.aCita(c)));
  }

  /**
   * Eventos de la agenda semanal. El backend expone el rango en `GET /citas`
   * (`desde`/`hasta`); `/citas/agenda` es la vista diaria y no devuelve el
   * mismo contrato, por eso se usa la primera.
   */
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
    return this.listar(fechaDesde, fechaHasta, oftalmologoId).pipe(
      map((citas) =>
        citas.map((c) => ({
          id: c.id,
          titulo: c.pacienteNombre,
          detalle: c.tipoConsulta || c.motivo || '',
          fecha: c.fecha,
          horaInicio: c.horaInicio,
          horaFin: c.horaFin,
          estadoCita: c.estadoCita,
          pacienteId: c.pacienteId,
          oftalmologoNombre: c.oftalmologoNombre,
          tipoConsulta: c.tipoConsulta,
        }))
      )
    );
  }

  /** El backend exige `oftalmologoId`; sin médico no hay franjas que mostrar. */
  disponibilidad(oftalmologoId: number | undefined, fecha: string): Observable<SlotDisponibilidad[]> {
    if (environment.useMockApi) {
      return of(this.demo.disponibilidadDe(fecha)).pipe(delay(140));
    }
    if (!oftalmologoId) {
      return of([]);
    }
    const params = new HttpParams().set('oftalmologoId', oftalmologoId).set('fecha', fecha);
    return this.http.get<FranjaApi[]>(`${this.base}/disponibilidad`, { params }).pipe(
      map((franjas) =>
        (franjas ?? []).map((f) => ({
          horaInicio: this.horaCorta(f.horaInicio),
          horaFin: this.horaCorta(f.horaFin),
          estado: f.estado === 'BOOKED' ? 'BOOKED' : 'FREE',
        }))
      )
    );
  }

  // ---------------------------------------------------------- Adaptadores
  //
  // El backend habla `pacienteDocumento`/`estado`/`notaInterna`; las pantallas
  // usan `documentoPaciente`/`estadoCita`/`notas`. La traducción vive aquí
  // para que un cambio de nombre en la API no obligue a tocar las plantillas.

  private aCita(c: CitaApi): Cita {
    return {
      id: c.id,
      pacienteId: c.pacienteId,
      pacienteNombre: c.pacienteNombre ?? '',
      documentoPaciente: c.pacienteDocumento ?? '',
      telefonoPaciente: '',
      oftalmologoId: c.oftalmologoId,
      oftalmologoNombre: c.oftalmologoNombre ?? '',
      subespecialidad: c.subespecialidad ?? '',
      fecha: c.fecha,
      horaInicio: this.horaCorta(c.horaInicio),
      horaFin: this.horaCorta(c.horaFin),
      tipoConsulta: c.tipoConsulta ?? '',
      motivo: c.motivo ?? '',
      estadoCita: (c.estado ?? 'PROGRAMADA') as EstadoCita,
      notas: c.notaInterna ?? '',
      motivoCancelacion: c.estado === 'CANCELADA' ? c.notaInterna ?? '' : '',
    };
  }

  /** Jackson serializa `LocalTime` como `HH:mm:ss`; la UI muestra `HH:mm`. */
  private horaCorta(hora: string | null | undefined): string {
    return (hora ?? '').slice(0, 5);
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
      tipoConsulta: 'Consulta',
      motivo: peticion.motivo,
      estadoCita: 'PROGRAMADA',
      notas: peticion.notaInterna,
      motivoCancelacion: '',
    };
  }
}

// ------------------------- Formas reales de la respuesta del backend -------

interface CitaApi {
  id: number;
  pacienteId: number;
  pacienteNombre?: string;
  pacienteDocumento?: string;
  oftalmologoId: number;
  oftalmologoNombre?: string;
  subespecialidad?: string;
  fecha: string;
  horaInicio: string;
  horaFin: string;
  tipoConsulta?: string;
  estado?: string;
  motivo?: string;
  notaInterna?: string;
}

interface FranjaApi {
  horaInicio: string;
  horaFin: string;
  estado: string;
  tipo?: string;
}
