import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map, of } from 'rxjs';
import { delay } from 'rxjs/operators';

import { environment } from '../../../environments/environment';
import {
  AvisoOperativo,
  CitaDia,
  DashboardAdmin,
  DashboardMedico,
  DashboardPaciente,
  DashboardRecepcion,
  DiagnosticoPortal,
  EstadoMedico,
  HistorialReciente,
  IntentoAcceso,
  MensajePortal,
  PageResponse,
  PuntoVolumen,
  TareaPendiente,
} from '../models';
import { DemoDataService } from './demo-data.service';

/**
 * Endpoints `/dashboards/*` y `/admin/auditoria` del backend.
 *
 * <p><b>Por qué hay una capa de adaptación.</b> El backend agrupa las métricas en
 * un arreglo (`indicadores`) porque así una tarjeta puede añadir su propio
 * texto y su tendencia sin cambiar el contrato. Las pantallas, en cambio,
 * leen campos planos (`totalPacientes`, `citasHoy`…). Si se tipara la respuesta
 * como `DashboardAdmin` sin más, TypeScript no detectaría nada —el JSON llega
 * bien— pero en pantalla todos los valores saldrían vacíos.
 *
 * <p>La traducción vive aquí y en ningún otro sitio: las pantallas siguen
 * leyendo su modelo plano y no saben nada de la forma que usa el backend.
 */
/** Como llega el panel del administrador desde la API. */
interface AdminApi {
  indicadores?: { etiqueta: string; valor: string; detalle?: string; tendencia?: string }[];
  tendenciaVolumen?: { etiqueta: string; valor: number }[];
  accesosRecientes?: {
    usuario: string;
    ip: string;
    accion: string;
    resultado: string;
    fecha: string;
  }[];
}

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private readonly http = inject(HttpClient);
  private readonly demo = inject(DemoDataService);

  private readonly base = `${environment.apiUrl}/dashboards`;

  admin(): Observable<DashboardAdmin> {
    if (environment.useMockApi) {
      return of(this.demo.dashboardAdmin).pipe(delay(120));
    }
    return this.http
      .get<AdminApi>(`${this.base}/admin`)
      .pipe(map((r) => this.aDashboardAdmin(r)));
  }

  /** Lee un indicador por su etiqueta; si no existe devuelve 0. */
  private valorDe(r: AdminApi, etiqueta: string): number {
    const encontrado = r.indicadores?.find((i) =>
      i.etiqueta.toLowerCase().includes(etiqueta.toLowerCase())
    );
    if (!encontrado) return 0;
    // El backend ya envía el número formateado ("1.234"); se limpia para poder
    // operar con él, por ejemplo para decidir cuál barra del gráfico destaca.
    return Number(encontrado.valor.replace(/[^\d]/g, '')) || 0;
  }

  private aDashboardAdmin(r: AdminApi): DashboardAdmin {
    const volumen: PuntoVolumen[] = (r.tendenciaVolumen ?? []).map((b) => ({
      etiqueta: b.etiqueta,
      total: b.valor,
      destacado: false,
    }));

    // Marca la barra más alta: es el «Peak» del prototipo (imagen 44).
    if (volumen.length) {
      const maximo = Math.max(...volumen.map((v) => v.total));
      const pico = volumen.find((v) => v.total === maximo);
      if (pico) pico.destacado = true;
    }

    const accesos: IntentoAcceso[] = (r.accesosRecientes ?? []).map((a) => ({
      usuario: a.usuario,
      ip: a.ip,
      hora: this.horaDe(a.fecha),
      resultado: a.resultado === 'FALLIDO' ? 'FALLIDO' : 'EXITOSO',
    }));

    return {
      totalPacientes: this.valorDe(r, 'Total de Pacientes'),
      citasHoy: this.valorDe(r, 'Citas'),
      oftalmologosActivos: this.valorDe(r, 'Oftalmólogos'),
      volumenPacientes: volumen,
      intentosAcceso: accesos,
    };
  }

  /** `2026-10-13T23:51:40` → `23:51 AM`. */
  private horaDe(iso: string): string {
    if (!iso) return '';
    const fecha = new Date(iso);
    if (Number.isNaN(fecha.getTime())) return iso;
    return fecha.toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  // ------------------------------------------------------------------ resto

  medico(): Observable<DashboardMedico> {
    if (environment.useMockApi) {
      return of(this.demo.dashboardMedico).pipe(delay(120));
    }
    return this.http
      .get<DashboardMedicoApi>(`${this.base}/medico`)
      .pipe(map((r) => this.aDashboardMedico(r)));
  }

  recepcion(): Observable<DashboardRecepcion> {
    if (environment.useMockApi) {
      return of(this.demo.dashboardRecepcion).pipe(delay(120));
    }
    return this.http
      .get<DashboardRecepcionApi>(`${this.base}/recepcion`)
      .pipe(map((r) => this.aDashboardRecepcion(r)));
  }

  paciente(): Observable<DashboardPaciente> {
    if (environment.useMockApi) {
      return of(this.demo.dashboardPaciente).pipe(delay(120));
    }
    return this.http
      .get<DashboardPacienteApi>(`${this.base}/paciente`)
      .pipe(map((r) => this.aDashboardPaciente(r)));
  }

  mensajes(): Observable<MensajePortal[]> {
    if (environment.useMockApi) {
      return of(this.demo.mensajesPortal).pipe(delay(120));
    }
    return of([]);
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
    return this.http
      .get<PageResponse<IntentoAcceso>>(`${environment.apiUrl}/admin/auditoria`, { params })
      .pipe(
        map((p) => ({
          ...p,
          content: (p.content ?? []).map((a) => ({
            usuario: a.usuario,
            ip: a.ip,
            hora: this.horaDe(a.hora),
            resultado: a.resultado === 'FALLIDO' ? 'FALLIDO' : 'EXITOSO',
          })),
        }))
      );
  }

  // ------------------------------------------------- Adaptadores por panel

  private aDashboardMedico(r: DashboardMedicoApi): DashboardMedico {
    return {
      fecha: new Date().toISOString().slice(0, 10),
      citasHoy: (r.agendaHoy ?? []).map((c) => this.aCitaDia(c)),
      pendientes: (r.tareas ?? []).map((t) => this.aTarea(t)),
      historialesRecientes: (r.historialesRecientes ?? []).map((p) => ({
        id: p.id,
        iniciales: p.iniciales ?? '',
        pacienteNombre: p.nombreCompleto ?? '',
        hora: p.fechaRegistro ? this.horaDe(p.fechaRegistro) : '',
      })),
    };
  }

  private aDashboardRecepcion(r: DashboardRecepcionApi): DashboardRecepcion {
    return {
      citasHoy: (r.citasHoy ?? []).map((c) => this.aCitaDia(c)),
      totalCitas: this.numeroDe(r.indicadores, 'Citas de hoy'),
      enEspera: this.numeroDe(r.indicadores, 'En espera'),
      medicos: (r.consultorios ?? []).map((c) => this.aEstadoMedico(c)),
      avisos: (r.avisos ?? []).map((a) => ({
        icono: a.severidad === 'ADVERTENCIA' ? 'alertTriangle' : 'info',
        texto: `${a.titulo} — ${a.detalle}`,
      })),
    };
  }

  private aDashboardPaciente(r: DashboardPacienteApi): DashboardPaciente {
    return {
      nombre: r.nombre ?? '',
      citas: (r.proximasCitas ?? []).map((c) => this.aCitaDia(c)),
      diagnosticos: (r.diagnosticos ?? []).map((d) => ({
        nombre: d.diagnostico ?? '',
        ojo: d.ojo ?? 'Ambos ojos',
        ultimaActualizacion: d.ultimaActualizacion ?? '',
        estado: 'EN_SEGUIMIENTO' as const,
      })),
    };
  }

  private aCitaDia(c: CitaApi): CitaDia {
    return {
      id: c.id,
      horaInicio: (c.horaInicio ?? '').slice(0, 5),
      horaFin: (c.horaFin ?? '').slice(0, 5),
      pacienteNombre: c.paciente ?? '',
      motivo: c.motivo ?? '',
      tipoConsulta: c.tipoConsulta ?? '',
      estado: (c.estado ?? 'PROGRAMADA') as CitaDia['estado'],
      sala: c.consultorio ?? '',
    };
  }

  private aTarea(t: TareaApi): TareaPendiente {
    return {
      id: t.referenciaId ?? 0,
      titulo: t.titulo ?? '',
      detalle: t.detalle ?? '',
      icono: 'clipboardList',
    };
  }

  private aEstadoMedico(c: ConsultorioApi): EstadoMedico {
    const ocupado = (c.estado ?? '').toUpperCase().includes('OCUPADO');
    return {
      id: c.oftalmologoId,
      nombreCompleto: c.oftalmologo ?? '',
      iniciales: this.iniciales(c.oftalmologo ?? ''),
      subespecialidad: c.consultorio ?? '',
      estado: ocupado ? 'OCUPADO' : 'DISPONIBLE',
      detalle: c.horaLiberacion ?? '',
    };
  }

  private iniciales(nombre: string): string {
    return nombre
      .replace(/^(Dr\.|Dra\.)\s*/i, '')
      .split(/\s+/)
      .slice(0, 2)
      .map((p) => p.charAt(0).toUpperCase())
      .join('');
  }

  private numeroDe(
    indicadores: { etiqueta: string; valor: string }[] | undefined,
    busca: string
  ): number {
    const i = indicadores?.find((x) => x.etiqueta.toLowerCase().includes(busca.toLowerCase()));
    return i ? Number(i.valor.replace(/[^\d]/g, '')) || 0 : 0;
  }
}

// ------------------------- Formas reales de la respuesta -------------------

interface CitaApi {
  id: number;
  horaInicio: string;
  horaFin: string;
  paciente?: string;
  motivo?: string;
  tipoConsulta?: string;
  estado?: string;
  consultorio?: string;
}

interface IndicadorApi {
  etiqueta: string;
  valor: string;
}

interface TareaApi {
  titulo: string;
  detalle: string;
  referenciaId?: number;
}

interface ConsultorioApi {
  oftalmologoId: number;
  oftalmologo: string;
  estado: string;
  horaLiberacion?: string;
  consultorio?: string;
}

interface AvisoApi {
  titulo: string;
  detalle: string;
  severidad: string;
}

interface DashboardMedicoApi {
  indicadores?: IndicadorApi[];
  agendaHoy?: CitaApi[];
  tareas?: TareaApi[];
  historialesRecientes?: {
    id: number;
    nombreCompleto: string;
    iniciales?: string;
    fechaRegistro?: string;
  }[];
}

interface DashboardRecepcionApi {
  indicadores?: IndicadorApi[];
  citasHoy?: CitaApi[];
  consultorios?: ConsultorioApi[];
  avisos?: AvisoApi[];
}

interface DashboardPacienteApi {
  nombre: string;
  proximasCitas?: (CitaApi & { fecha?: string })[];
  diagnosticos?: {
    diagnostico: string;
    ultimaActualizacion: string;
    ojo?: string;
  }[];
}