import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { delay, map } from 'rxjs/operators';

import { environment } from '../../../environments/environment';
import {
  Consulta,
  ConsultaRequest,
  ExamenRequest,
  PageResponse,
  PuntoEvolucion,
  RegistroAgudeza,
} from '../models';
import { DemoDataService } from './demo-data.service';

/** Endpoints `/historiales` del backend. */
@Injectable({ providedIn: 'root' })
export class HistorialService {
  private readonly http = inject(HttpClient);
  private readonly demo = inject(DemoDataService);

  private readonly base = `${environment.apiUrl}/historiales`;

  listar(pacienteId: number, page: number, size: number): Observable<PageResponse<Consulta>> {
    if (environment.useMockApi) {
      const todas = this.demo.consultasDe(pacienteId);
      const inicio = page * size;
      return of({
        content: todas.slice(inicio, inicio + size),
        totalElements: todas.length,
        totalPages: Math.max(1, Math.ceil(todas.length / size)),
        number: page,
        size,
        first: inicio === 0,
        last: inicio + size >= todas.length,
      }).pipe(delay(120));
    }

    const params = new HttpParams()
      .set('pacienteId', pacienteId)
      .set('page', page)
      .set('size', size);
    return this.http.get<PageResponse<Consulta>>(this.base, { params });
  }

  obtener(id: number): Observable<Consulta> {
    if (environment.useMockApi) {
      const encontrada = this.todas().find((c) => c.id === id) ?? this.todas()[0];
      return of(encontrada).pipe(delay(80));
    }
    return this.http.get<Consulta>(`${this.base}/${id}`);
  }

  delPaciente(pacienteId: number): Observable<Consulta[]> {
    if (environment.useMockApi) {
      return of(this.demo.consultasDe(pacienteId)).pipe(delay(120));
    }
    return this.http.get<Consulta[]>(`${this.base}/paciente/${pacienteId}`);
  }

  crear(peticion: ConsultaRequest): Observable<Consulta> {
    if (environment.useMockApi) {
      return of(this.construir(peticion)).pipe(delay(180));
    }
    return this.http.post<Consulta>(this.base, peticion);
  }

  /** Serie de presión intraocular usada por el gráfico de evolución. */
  evolucion(pacienteId: number): Observable<PuntoEvolucion[]> {
    if (environment.useMockApi) {
      return of(this.demo.evolucionDe(pacienteId)).pipe(delay(150));
    }
    return this.http.get<PuntoEvolucion[]>(`${this.base}/paciente/${pacienteId}/evolucion`);
  }

  registrarExamen(consultaId: number, examen: ExamenRequest): Observable<Consulta> {
    if (environment.useMockApi) {
      this.demo.nuevoExamen(examen);
      return of(this.construirConsultaVacia(consultaId)).pipe(delay(180));
    }
    return this.http.post<Consulta>(`${this.base}/${consultaId}/examenes`, examen);
  }

  // ------------------------------------------------------------- Derivado

  /**
   * Tabla «Evolución de la Agudeza Visual» (imagen 27). El backend no expone
   * estas observaciones: se derivan aquí de la serie de evolución para no
   * inventar un endpoint nuevo.
   */
  registrosAgudeza(pacienteId: number): Observable<RegistroAgudeza[]> {
    return this.evolucion(pacienteId).pipe(
      map((serie) =>
        [...serie]
          .reverse()
          .map((punto, indice) => ({
            fecha: punto.fecha,
            etiqueta: this.etiquetaDe(punto.fecha),
            agudezaOd: punto.agudezaOd,
            agudezaOi: punto.agudezaOi,
            observaciones: this.observacionDe(punto, serie.length - 1 - indice),
            estable: indice > 0 && punto.agudezaOd === serie[serie.length - 1 - indice]?.agudezaOd,
          }))
      )
    );
  }

  /** «Hoy», «Ene 12, 2024», … como en la primera fila de la tabla de evolución. */
  private etiquetaDe(fecha: string): string {
    const hoy = new Date().toISOString().slice(0, 10);
    if (fecha === hoy) {
      return 'Hoy';
    }
    const d = new Date(`${fecha}T00:00:00`);
    const mes = d.toLocaleDateString('en-US', { month: 'short' }).replace('.', '');
    return `${mes} ${String(d.getDate()).padStart(2, '0')}, ${d.getFullYear()}`;
  }

  private observacionDe(punto: PuntoEvolucion, posicion: number): string {
    if (posicion === 0) {
      return 'Campos estables. Se continúa tratamiento actual.';
    }
    if (posicion === 1) {
      return 'Se observan síntomas leves de ojo seco.';
    }
    if (posicion === 2) {
      return 'Ajuste de tratamiento; mejora en lectura OD.';
    }
    return 'Línea base inicial para nueva fase de tratamiento.';
  }

  private todas(): Consulta[] {
    return Object.values(this.demo.consultas).flat();
  }

  private construir(peticion: ConsultaRequest): Consulta {
    return {
      id: Date.now(),
      pacienteId: peticion.pacienteId,
      pacienteNombre: '',
      fecha: new Date().toLocaleDateString('es-ES', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }),
      hora: new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
      motivo: peticion.motivo,
      tipoConsulta: peticion.tipoConsulta,
      diagnosticoPrincipal: peticion.diagnosticoPrincipal,
      agudezaOd: peticion.agudezaOd,
      agudezaOi: peticion.agudezaOi,
      pioOd: peticion.pioOd,
      pioOi: peticion.pioOi,
      pupilas: peticion.pupilas,
      biomicroscopia: peticion.biomicroscopia,
      fondoOjo: peticion.fondoOjo,
      notasSubjectivo: peticion.notasSubjectivo,
      notasObjetivo: peticion.notasObjetivo,
      notasEvaluacion: peticion.notasEvaluacion,
      notasPlan: peticion.notasPlan,
      oftalmologoId: 1,
      oftalmologoNombre: 'Dr. Elena Rodríguez',
      archivos: [],
      esUltima: true,
    };
  }

  private construirConsultaVacia(consultaId: number): Consulta {
    const base = this.todas().find((c) => c.id === consultaId);
    return (
      base ?? {
        ...this.construir({
          pacienteId: 0,
          motivo: '',
          tipoConsulta: '',
          diagnosticoPrincipal: '',
          agudezaOd: '',
          agudezaOi: '',
          pioOd: 0,
          pioOi: 0,
          pupilas: '',
          biomicroscopia: '',
          fondoOjo: '',
          notasSubjectivo: '',
          notasObjetivo: '',
          notasEvaluacion: '',
          notasPlan: '',
        }),
        id: consultaId,
      }
    );
  }
}