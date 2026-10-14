package com.clinicaojitos.domain.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;

/**
 * Contratos del módulo de citas médicas (RF-03).
 */
public final class CitaDto {

    private CitaDto() {
    }

    /** Programación de una cita. */
    public record Request(
            @NotNull(message = "El paciente es obligatorio")
            Long pacienteId,

            @NotNull(message = "El oftalmólogo es obligatorio")
            Long oftalmologoId,

            Integer sedeId,
            String consultorio,

            @NotNull(message = "La fecha es obligatoria")
            LocalDate fecha,

            @NotNull(message = "La hora de inicio es obligatoria")
            LocalTime horaInicio,

            @NotNull(message = "La hora de fin es obligatoria")
            LocalTime horaFin,

            Integer tipoConsultaId,

            @Size(max = 255)
            String motivo,

            @Size(max = 500)
            String notaInterna
    ) {
    }

    /** Reprogramación: cambia fecha u hora y deja constancia del motivo. */
    public record ReprogramarRequest(
            @NotNull(message = "La nueva fecha es obligatoria")
            LocalDate fecha,

            @NotNull(message = "La nueva hora de inicio es obligatoria")
            LocalTime horaInicio,

            @NotNull(message = "La nueva hora de fin es obligatoria")
            LocalTime horaFin,

            @Size(max = 500)
            String notaInterna
    ) {
    }

    /** Cancelación de un turno. */
    public record CancelarRequest(
            @NotNull(message = "Debe indicar el motivo de la cancelación")
            @Size(min = 5, max = 500, message = "El motivo debe tener entre 5 y 500 caracteres")
            String motivo
    ) {
    }

    /** Cambio de estado en el flujo de atención. */
    public record EstadoRequest(
            @NotNull(message = "El estado es obligatorio")
            String estado
    ) {
    }

    /** Cita registrada. */
    public record Response(
            Long id,
            Long pacienteId,
            String pacienteNombre,
            String pacienteDocumento,
            Long oftalmologoId,
            String oftalmologoNombre,
            String subespecialidad,
            Integer sedeId,
            String sede,
            String consultorio,
            LocalDate fecha,
            LocalTime horaInicio,
            LocalTime horaFin,
            Integer tipoConsultaId,
            String tipoConsulta,
            String estado,
            String estadoNombre,
            String motivo,
            String notaInterna,
            boolean ocupaAgenda,
            LocalDateTime fechaCreacion
    ) {
    }

    /** Franja disponible u ocupada del profesional (pantalla 3.6.9). */
    public record Franja(
            LocalTime horaInicio,
            LocalTime horaFin,
            String estado,
            String tipo
    ) {
    }

    /** Evento del calendario semanal. */
    public record Evento(
            Long id,
            LocalDate fecha,
            LocalTime horaInicio,
            LocalTime horaFin,
            Long pacienteId,
            String paciente,
            String tipo,
            String estado,
            String consultorio
    ) {
    }

    /** Fila de la agenda diaria. */
    public record AgendaDia(
            Long id,
            LocalTime horaInicio,
            LocalTime horaFin,
            String paciente,
            String documento,
            String motivo,
            String estado,
            String estadoNombre,
            String consultorio,
            String tipoConsulta
    ) {
    }
}
