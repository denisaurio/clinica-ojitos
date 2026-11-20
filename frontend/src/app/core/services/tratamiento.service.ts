import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { delay, map, switchMap } from 'rxjs/operators';

import { environment } from '../../../environments/environment';
import {
  CatalogoItem,
  Cirugia,
  CirugiaRequest,
  ControlTratamiento,
  Lateralidad,
  SeguimientoRequest,
  Tratamiento,
  TratamientoRequest,
  TipoTratamiento,
} from '../models';
import { DemoDataService } from './demo-data.service';

/** Endpoints `/tratamientos` del backend (las cirugías cuelgan de aquí). */
@Injectable({ providedIn: 'root' })
export class TratamientoService {
  private readonly http = inject(HttpClient);
  private readonly demo = inject(DemoDataService);

  private readonly base = `${environment.apiUrl}/tratamientos`;
  private readonly baseCatalogo = `${environment.apiUrl}/catalogo`;

  listarPorPaciente(pacienteId: number): Observable<Tratamiento[]> {
    if (environment.useMockApi) {
      return of(this.demo.tratamientosDe(pacienteId)).pipe(delay(120));
    }
    return this.http
      .get<TratamientoApi[]>(`${this.base}/paciente/${pacienteId}`)
      .pipe(map((lista) => (lista ?? []).map((t) => this.aTratamiento(t))));
  }

  crear(peticion: TratamientoRequest): Observable<Tratamiento> {
    if (environment.useMockApi) {
      const paciente = this.demo.pacientes.find((p) => p.id === peticion.pacienteId);
      const tipos: Record<number, Tratamiento['tipo']> = {
        1: 'MEDICACION',
        2: 'LENTES',
        3: 'TERAPIA',
        4: 'CIRUGIA',
      };
      return of({
        id: Date.now(),
        pacienteId: peticion.pacienteId,
        pacienteNombre: paciente?.nombreCompleto ?? '',
        tipo: tipos[peticion.tipoId] ?? 'MEDICACION',
        medicamento: peticion.medicamento ?? '',
        dosis: peticion.dosis ?? '',
        frecuencia: peticion.frecuencia ?? '',
        duracion: peticion.duracion ?? '',
        instrucciones: peticion.instrucciones ?? '',
        fechaInicio: peticion.fechaInicio ?? new Date().toISOString().slice(0, 10),
        fechaFin: 'Indefinido',
        estado: 'ACTIVO' as const,
      }).pipe(delay(200));
    }

    const cuerpo = {
      pacienteId: peticion.pacienteId,
      oftalmologoId: peticion.oftalmologoId ?? null,
      tipoId: peticion.tipoId,
      estadoId: peticion.estadoId,
      medicamento: peticion.medicamento || null,
      principioActivo: peticion.principioActivo || null,
      dosis: peticion.dosis || null,
      frecuencia: peticion.frecuencia || null,
      duracion: peticion.duracion || null,
      indicaciones: peticion.instrucciones || null,
      fechaInicio: peticion.fechaInicio ?? new Date().toISOString().slice(0, 10),
      activo: true,
    };
    return this.http
      .post<TratamientoApi>(this.base, cuerpo)
      .pipe(map((t) => this.aTratamiento(t)));
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

  /** Procedimientos quirúrgicos de un paciente (no existe listado global). */
  listarCirugias(pacienteId: number): Observable<Cirugia[]> {
    if (environment.useMockApi) {
      return of(this.demo.cirugias.filter((c) => c.pacienteId === pacienteId)).pipe(delay(120));
    }
    return this.http
      .get<CirugiaApi[]>(`${this.base}/cirugias/paciente/${pacienteId}`)
      .pipe(map((lista) => (lista ?? []).map((c) => this.aCirugia(c))));
  }

  crearCirugia(peticion: CirugiaRequest): Observable<Cirugia> {
    if (environment.useMockApi) {
      const paciente = this.demo.pacientes.find((p) => p.id === peticion.pacienteId);
      return of({
        id: Date.now(),
        pacienteId: peticion.pacienteId,
        pacienteNombre: paciente?.nombreCompleto ?? '',
        oftalmologoId: peticion.oftalmologoId,
        diagnosticoPreoperatorio: peticion.diagnosticoPreoperatorio,
        tipoCirugia: peticion.tipoCirugia,
        fecha: peticion.fecha,
        lateralidad: peticion.lateralidad,
        tipoAnestesia: peticion.tipoAnestesia,
        reporteOperatorio: peticion.reporteOperatorio,
        estado: peticion.estado === 'PROGRAMADA' ? ('PROGRAMADA' as const) : ('FINALIZADA' as const),
      }).pipe(delay(220));
    }

    // El catálogo de ojos traduce OD/OI/AO al id que guarda la base.
    return this.http.get<CatalogoItem[]>(`${this.baseCatalogo}/ojos`).pipe(
      switchMap((ojos) => {
        const ojoId = ojos.find((o) => o.codigo === peticion.lateralidad)?.id ?? null;
        const cuerpo = {
          pacienteId: peticion.pacienteId,
          oftalmologoId: peticion.oftalmologoId,
          diagnosticoPreop: peticion.diagnosticoPreoperatorio,
          tipoCirugia: peticion.tipoCirugia,
          ojoId,
          fechaProgramada: peticion.fecha,
          fechaRealizada: peticion.estado === 'REALIZADA' ? peticion.fecha : null,
          anestesia: peticion.tipoAnestesia,
          tecnica: peticion.reporteOperatorio || null,
          estado: peticion.estado,
          consultaIds: peticion.consultaIds,
        };
        return this.http.post<CirugiaApi>(`${this.base}/cirugias`, cuerpo);
      }),
      map((c) => this.aCirugia(c))
    );
  }

  // ---------------------------------------------------------- Adaptadores

  private aTratamiento(t: TratamientoApi): Tratamiento {
    return {
      id: t.id,
      pacienteId: t.pacienteId,
      pacienteNombre: t.pacienteNombre ?? '',
      tipo: this.tipoDesde(t.tipo ?? ''),
      medicamento: t.medicamento ?? '',
      dosis: t.dosis ?? '',
      frecuencia: t.frecuencia ?? '',
      duracion: t.duracion ?? '',
      instrucciones: t.indicaciones ?? '',
      fechaInicio: (t.fechaInicio ?? '').slice(0, 10),
      fechaFin: t.fechaFin ? t.fechaFin.slice(0, 10) : 'Indefinido',
      estado: this.estadoDesde(t.estado ?? 'ACTIVO'),
    };
  }

  private aCirugia(c: CirugiaApi): Cirugia {
    return {
      id: c.id,
      pacienteId: c.pacienteId,
      pacienteNombre: c.pacienteNombre ?? '',
      oftalmologoId: c.oftalmologoId,
      oftalmologoNombre: c.oftalmologoNombre ?? '',
      diagnosticoPreoperatorio: c.diagnosticoPreop ?? '',
      tipoCirugia: c.tipoCirugia ?? '',
      fecha: c.fechaRealizada ?? c.fechaProgramada ?? '',
      lateralidad: this.lateralidadDesde(c.ojo ?? ''),
      tipoAnestesia: c.anestesia ?? '',
      reporteOperatorio: [c.tecnica, c.incidencias].filter(Boolean).join('\n\n'),
      estado: this.estadoCirugiaDesde(c.estado ?? 'PROGRAMADA'),
      consultas: (c.consultas ?? []).map((v) => ({
        id: v.id,
        fecha: (v.fecha ?? '').slice(0, 10),
        diagnostico: v.diagnostico ?? '',
        oftalmologoNombre: v.oftalmologoNombre ?? '',
      })),
    };
  }

  private tipoDesde(nombre: string): TipoTratamiento {
    const n = nombre.toLowerCase();
    if (n.includes('lente') || n.includes('óptic') || n.includes('optic')) return 'LENTES';
    if (n.includes('terapia')) return 'TERAPIA';
    if (n.includes('cirug')) return 'CIRUGIA';
    return 'MEDICACION';
  }

  private estadoDesde(nombre: string): Tratamiento['estado'] {
    const n = nombre.toUpperCase();
    if (n.includes('COMPLET')) return 'FINALIZADO';
    if (n.includes('SUSPEND') || n.includes('ANULAD')) return 'SUSPENDIDO';
    return 'ACTIVO';
  }

  private estadoCirugiaDesde(estado: string): Cirugia['estado'] {
    const e = estado.toUpperCase();
    if (e.includes('REALIZ') || e.includes('FINAL')) return 'FINALIZADA';
    if (e.includes('CURSO')) return 'EN_CURSO';
    if (e.includes('COMPLIC')) return 'COMPLICACION';
    return 'PROGRAMADA';
  }

  private lateralidadDesde(ojo: string): Lateralidad {
    const o = ojo.toUpperCase();
    if (o.includes('DERECH') || o === 'OD') return 'OD';
    if (o.includes('IZQUIERD') || o === 'OI') return 'OI';
    return 'AO';
  }
}

// ------------------------- Formas reales de la respuesta del backend -------

interface TratamientoApi {
  id: number;
  pacienteId: number;
  pacienteNombre?: string;
  tipo?: string;
  estado?: string;
  medicamento?: string;
  dosis?: string;
  frecuencia?: string;
  duracion?: string;
  indicaciones?: string;
  fechaInicio?: string;
  fechaFin?: string;
}

interface CirugiaApi {
  id: number;
  pacienteId: number;
  pacienteNombre?: string;
  oftalmologoId?: number;
  oftalmologoNombre?: string;
  diagnosticoPreop?: string;
  tipoCirugia?: string;
  ojo?: string;
  fechaProgramada?: string;
  fechaRealizada?: string;
  anestesia?: string;
  tecnica?: string;
  incidencias?: string;
  estado?: string;
  consultas?: { id: number; fecha?: string; diagnostico?: string; oftalmologoNombre?: string }[];
}
