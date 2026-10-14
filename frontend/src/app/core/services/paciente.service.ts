import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map, of } from 'rxjs';
import { delay } from 'rxjs/operators';

import { environment } from '../../../environments/environment';
import {
  ActividadReciente,
  AltaPaciente,
  Credenciales,
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
    return this.http
      .get<PageResponse<PacienteResumenApi>>(this.base, { params })
      .pipe(
        map((p) => ({
          ...p,
          content: (p.content ?? []).map((x) => this.aPacienteDesdeResumen(x)),
        }))
      );
  }

  /**
   * Ficha completa. El backend envuelve la respuesta en un `Detalle` con los
   * contadores de cabecera y la actividad reciente; aquí se desenvuelve para
   * devolver solo el paciente, como espera la pantalla.
   */
  obtener(id: number): Observable<Paciente> {
    if (environment.useMockApi) {
      return of(this.demo.pacientes.find((p) => p.id === id) ?? this.demo.pacientes[0]).pipe(
        delay(100)
      );
    }
    return this.http.get<PacienteApi | PacienteDetalleApi>(`${this.base}/${id}`).pipe(
      map((r) => {
        const p = 'paciente' in r ? r.paciente : r;
        return this.aPaciente(p);
      })
    );
  }

  crear(peticion: PacienteRequest & { password?: string }): Observable<AltaPaciente> {
    if (environment.useMockApi) {
      const usuario = peticion.usuario || `${peticion.nombres} ${peticion.apellidos}`;
      return of({
        paciente: this.construir(peticion, this.demo.pacientes.length + 1),
        credenciales: {
          username: usuario,
          password: peticion.password ?? 'Demo9!aZ#2kLq',
          nombreCompleto: `${peticion.nombres} ${peticion.apellidos}`,
          textoParaDescargar: 'Credenciales de demostración',
        },
      }).pipe(delay(150));
    }
    return this.http
      .post<{ paciente: PacienteApi; credenciales: Credenciales }>(
        this.base,
        this.aPeticion(peticion)
      )
      .pipe(map((r) => ({ paciente: this.aPaciente(r.paciente), credenciales: r.credenciales })));
  }

  actualizar(id: number, peticion: PacienteRequest): Observable<Paciente> {
    if (environment.useMockApi) {
      return of(this.construir(peticion, id)).pipe(delay(150));
    }
    return this.http
      .put<PacienteApi>(`${this.base}/${id}`, this.aPeticion(peticion))
      .pipe(map((r) => this.aPaciente(r)));
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
    return this.http
      .get<ActividadApi[]>(`${this.base}/${id}/actividad-reciente`)
      .pipe(
        map((lista) =>
          (lista ?? []).map((a) => ({
            tipo: this.tipoDeActividad(a.tipo ?? 'Consulta'),
            titulo: a.descripcion ?? a.tipo ?? '',
            detalle: a.profesional ?? '',
            fecha: a.fecha ? this.fechaCorta(a.fecha) : '',
          }))
        )
      );
  }

  private tipoDeActividad(tipo: string): ActividadReciente['tipo'] {
    const t = tipo.toLowerCase();
    if (t.includes('examen')) return 'EXAMEN';
    if (t.includes('cita')) return 'CITA';
    if (t.includes('tratamiento')) return 'TRATAMIENTO';
    return 'CONSULTA';
  }

  // --------------------------------------------------------- Adaptadores
  //
  // El backend llama `tipoSeguro` y `historialOcular`; las pantallas leen
  // `seguro` y `antecedentesOculares`. La traducción vive aquí para que
  // renombrar un campo en la API no obligue a tocar todas las plantillas.

  private aPaciente(p: PacienteApi): Paciente {
    return {
      id: p.id,
      nombres: p.nombres ?? '',
      apellidos: p.apellidos ?? '',
      nombreCompleto: p.nombreCompleto ?? `${p.nombres ?? ''} ${p.apellidos ?? ''}`.trim(),
      documento: p.documento ?? '',
      fechaNacimiento: p.fechaNacimiento ?? '',
      edad: p.edad ?? 0,
      telefono: p.telefono ?? '',
      email: p.email ?? '',
      direccion: p.direccion ?? '',
      seguro: p.tipoSeguro ?? 'Particular',
      grupoSanguineo: p.grupoSanguineo ?? '',
      antecedentesOculares: p.historialOcular ?? '',
      alergias: p.alergias ?? '',
      activo: p.activo ?? true,
      fechaRegistro: p.fechaRegistro ? this.fechaCorta(p.fechaRegistro) : '',
    };
  }

  /** La fila del listado solo trae un resumen: se completa con campos vacíos. */
  private aPacienteDesdeResumen(r: PacienteResumenApi): Paciente {
    return {
      ...this.aPaciente(r as PacienteApi),
      telefono: r.telefono ?? '',
      email: r.email ?? '',
      seguro: r.seguro ?? 'Particular',
    };
  }

  /** Envía los nombres que espera el backend. */
  private aPeticion(p: PacienteRequest & { password?: string }) {
    return {
      nombres: p.nombres,
      apellidos: p.apellidos,
      documento: p.documento,
      fechaNacimiento: p.fechaNacimiento || null,

      telefono: p.telefono || null,
      email: p.email || null,
      direccion: p.direccion || null,
      tipoSeguro: p.seguro || null,
      grupoSanguineo: p.grupoSanguineo || null,
      historialOcular: p.antecedentesOculares || null,
      alergias: p.alergias || null,
      password: p.password || null,
      username: p.usuario || null,
      activo: true,
    };
  }

  private fechaCorta(iso: string): string {
    return iso.length >= 10 ? iso.slice(0, 10) : iso;
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
// ------------------------- Formas reales de la respuesta del backend -------

/** Fila del listado (`PacienteDto.Resumen`). */
interface PacienteResumenApi {
  id: number;
  nombreCompleto: string;
  iniciales?: string;
  documento: string;
  edad?: number;
  telefono?: string;
  email?: string;
  seguro?: string;
  activo?: boolean;
}

/** Ficha completa (`PacienteDto.Response`). */
interface PacienteApi {
  id: number;
  nombres?: string;
  apellidos?: string;
  nombreCompleto?: string;
  documento?: string;
  fechaNacimiento?: string;
  edad?: number;
  telefono?: string;
  email?: string;
  direccion?: string;
  tipoSeguro?: string;
  grupoSanguineo?: string;
  historialOcular?: string;
  alergias?: string;
  activo?: boolean;
  fechaRegistro?: string;
}

/** `GET /pacientes/{id}` devuelve este envoltorio, no el paciente suelto. */
interface PacienteDetalleApi {
  paciente: PacienteApi;
  totalConsultas: number;
  totalCitas: number;
  tratamientosActivos: number;
  actividadReciente: ActividadApi[];
}

interface ActividadApi {
  id: number;
  tipo?: string;
  descripcion?: string;
  profesional?: string;
  fecha?: string;
}