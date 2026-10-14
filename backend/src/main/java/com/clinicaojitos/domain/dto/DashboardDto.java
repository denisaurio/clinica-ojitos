package com.clinicaojitos.domain.dto;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

/**
 * Payloads de los paneles por rol (pantallas 3.6.21 a 3.6.24) y del registro
 * de auditoría del administrador (RNF-01).
 */
public final class DashboardDto {

    private DashboardDto() {
    }

    /** Tarjeta de indicador con su variación. */
    public record Indicador(
            String etiqueta,
            String valor,
            String detalle,
            String tendencia
    ) {
    }

    /** Barra de la gráfica de volumen de pacientes. */
    public record Barra(
            String etiqueta,
            long valor
    ) {
    }

    /** Fila del registro de accesos (pantalla 3.6.21). */
    public record Acceso(
            String usuario,
            String ip,
            String accion,
            String resultado,
            LocalDateTime fecha
    ) {
    }

    /** Panel del administrador. */
    public record Administrador(
            List<Indicador> indicadores,
            List<Barra> tendenciaVolumen,
            List<Acceso> accesosRecientes
    ) {
    }

    /** Tarea clínica pendiente en el panel del especialista. */
    public record Tarea(
            String titulo,
            String detalle,
            String prioridad,
            Long referenciaId
    ) {
    }

    /** Panel diario del oftalmólogo (pantalla 3.6.22). */
    public record Medico(
            List<Indicador> indicadores,
            List<CitaDto.AgendaDia> agendaHoy,
            List<Tarea> tareas,
            List<PacienteDto.Resumen> historialesRecientes
    ) {
    }

    /** Estado en vivo de un consultorio. */
    public record EstadoConsultorio(
            Long oftalmologoId,
            String oftalmologo,
            String estado,
            String horaLiberacion,
            String consultorio
    ) {
    }

    /** Aviso operativo del panel de recepción. */
    public record Aviso(
            String titulo,
            String detalle,
            String severidad
    ) {
    }

    /** Panel de recepción y triaje (pantalla 3.6.23). */
    public record Recepcion(
            List<Indicador> indicadores,
            List<CitaDto.AgendaDia> citasHoy,
            List<EstadoConsultorio> consultorios,
            List<Aviso> avisos
    ) {
    }

    /** Portal del paciente (pantalla 3.6.24). */
    public record Portal(
            String nombre,
            String mensaje,
            List<CitaDto.Response> proximasCitas,
            List<ConsultaDto.DiagnosticoVigente> diagnosticos,
            List<ConsultaDto.Evolución> evolucion
    ) {
    }

    /** Filtro del registro de auditoría. */
    public record AuditoriaFiltro(
            Long usuarioId,
            String accion,
            LocalDate desde,
            LocalDate hasta,
            int limite
    ) {
    }
}
