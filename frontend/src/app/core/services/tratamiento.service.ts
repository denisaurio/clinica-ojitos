import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { delay } from 'rxjs/operators';

import { environment } from '../../../environments/environment';
import {
  Cirugia,
  CirugiaRequest,
  ControlTratamiento,
  SeguimientoRequest,
  Tratamiento,
  TratamientoRequest,
} from '../models';
import { DemoDataService } from './demo-data.service';

/** Endpoints `/tratamientos` y `/cirugias` del backend. */
@Injectable({ providedIn: 'root' })
export class TratamientoService {
  private readonly http = inject(HttpClient);
  private readonly demo = inject(DemoDataService);

  private readonly base = `${environment.apiUrl}/tratamientos`;
  private readonly baseCirugias = `${environment.apiUrl}/cirugias`;

  listarPorPaciente(pacienteId: number): Observable<Tratamiento[]> {
    if (environment.useMockApi) {
      return of(this.demo.tratamientosDe(pacienteId)).pipe(delay(120));
    }
    return this.http.get<Tratamiento[]>(`${this.base}/paciente/${pacienteId}`);
  }

  crear(peticion: TratamientoRequest): Observable<Tratamiento> {
    if (environment.useMockApi) {
      const paciente = this.demo.pacientes.find((p) => p.id === peticion.pacienteId);
      return of({
        id: Date.now(),
        pacienteId: peticion.pacienteId,
        pacienteNombre: paciente?.nombreCompleto ?? '',
        tipo: peticion.tipo,
        medicamento: peticion.medicamento,
        dosis: peticion.dosis,
        frecuencia: peticion.frecuencia,
        duracion: peticion.duracion,
        instrucciones: peticion.instrucciones,
        fechaInicio: new Date().toLocaleDateString('es-ES', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        }),
        fechaFin: 'Indefinido',
        estado: 'ACTIVO' as const,
      }).pipe(delay(200));
    }
    return this.http.post<Tratamiento>(this.base, peticion);
  }

  registrarSeguimiento(id: number, peticion: SeguimientoRequest): Observable<ControlTratamiento> {
    if (environment.useMockApi) {
      return of({
        id: Date.now(),
        tratamientoId: id,
        fecha: peticion.fecha,
        resultado: peticion.resultado,
        pioOd: peticion.pioOd,
        pioOi: peticion.pioOi,
        observaciones: peticion.observaciones,
      }).pipe(delay(180));
    }
    return this.http.patch<ControlTratamiento>(`${this.base}/${id}/seguimiento`, peticion);
  }

  controles(id: number): Observable<ControlTratamiento[]> {
    if (environment.useMockApi) {
      return of(this.demo.controlesDe(id)).pipe(delay(120));
    }
    return this.http.get<ControlTratamiento[]>(`${this.base}/${id}/controles`);
  }

  listarCirugias(): Observable<Cirugia[]> {
    if (environment.useMockApi) {
      return of(this.demo.cirugias).pipe(delay(120));
    }
    return this.http.get<Cirugia[]>(this.baseCirugias);
  }

  crearCirugia(peticion: CirugiaRequest): Observable<Cirugia> {
    if (environment.useMockApi) {
      const paciente = this.demo.pacientes.find((p) => p.id === peticion.pacienteId);
      return of({
        id: Date.now(),
        pacienteId: peticion.pacienteId,
        pacienteNombre: paciente?.nombreCompleto ?? '',
        diagnosticoPreoperatorio: peticion.diagnosticoPreoperatorio,
        tipoCirugia: peticion.tipoCirugia,
        fecha: peticion.fecha,
        lateralidad: peticion.lateralidad,
        tipoAnestesia: peticion.tipoAnestesia,
        reporteOperatorio: peticion.reporteOperatorio,
        estado: 'FINALIZADA' as const,
      }).pipe(delay(220));
    }
    return this.http.post<Cirugia>(this.baseCirugias, peticion);
  }
}