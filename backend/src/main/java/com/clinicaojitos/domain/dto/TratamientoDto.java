package com.clinicaojitos.domain.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;
import java.util.List;

/**
 * Contratos de tratamientos y procedimientos quirúrgicos (RF-04).
 */
public final class TratamientoDto {

    private TratamientoDto() {
    }

    /** Indicación terapéutica. */
    public record Request(
            @NotNull(message = "El paciente es obligatorio")
            Long pacienteId,

            Long oftalmologoId,
            Long consultaId,

            @NotNull(message = "El tipo de tratamiento es obligatorio")
            Integer tipoId,

            @NotNull(message = "El estado es obligatorio")
            Integer estadoId,

            @Size(max = 150)
            String medicamento,

            @Size(max = 150)
            String principioActivo,

            @Size(max = 100)
            String dosis,

            Integer ojoId,
            String ojo,

            @Size(max = 80)
            String frecuencia,

            @Size(max = 80)
            String duracion,

            Long cirugiaId,

            @NotNull(message = "La fecha de inicio es obligatoria")
            LocalDate fechaInicio,

            LocalDate fechaFin,
            LocalDate fechaControl,

            @Size(max = 3000)
            String indicaciones,

            Boolean activo
    ) {
    }

    /** Tratamiento registrado. */
    public record Response(
            Long id,
            Long pacienteId,
            String pacienteNombre,
            Long oftalmologoId,
            String oftalmologoNombre,
            Long consultaId,
            Integer tipoId,
            String tipo,
            Integer estadoId,
            String estado,
            String medicamento,
            String principioActivo,
            String dosis,
            Integer ojoId,
            String ojo,
            String frecuencia,
            String duracion,
            Long cirugiaId,
            LocalDate fechaInicio,
            LocalDate fechaFin,
            LocalDate fechaControl,
            String indicaciones,
            boolean activo
    ) {
    }

    /** Registro de un control de seguimiento (RF4.5). */
    public record SeguimientoRequest(
            @NotNull(message = "La fecha del control es obligatoria")
            LocalDate fecha,

            @Size(max = 80)
            String resultado,

            Double pioOd,
            Double pioOi,

            @Size(max = 3000)
            String observaciones
    ) {
    }

    /** Control registrado. */
    public record ControlResponse(
            Long id,
            Long tratamientoId,
            Long oftalmologoId,
            String oftalmologoNombre,
            LocalDate fecha,
            String resultado,
            Double pioOd,
            Double pioOi,
            String observaciones
    ) {
    }

    /** Procedimiento quirúrgico (pantalla 3.6.13). */
    public record CirugiaRequest(
            @NotNull(message = "El paciente es obligatorio")
            Long pacienteId,

            @NotNull(message = "El oftalmólogo es obligatorio")
            Long oftalmologoId,

            @Size(max = 500)
            String diagnosticoPreop,

            @NotNull(message = "El tipo de cirugía es obligatorio")
            @Size(max = 120)
            String tipoCirugia,

            Integer ojoId,
            LocalDate fechaProgramada,
            LocalDate fechaRealizada,

            @Size(max = 60)
            String anestesia,

            @Size(max = 3000)
            String tecnica,

            @Size(max = 3000)
            String incidencias,

            @Size(max = 120)
            String lenteIntraocular,

            @Size(max = 30)
            String estado
    ) {
    }

    /** Procedimiento quirúrgico registrado. */
    public record CirugiaResponse(
            Long id,
            Long pacienteId,
            String pacienteNombre,
            Long oftalmologoId,
            String oftalmologoNombre,
            String diagnosticoPreop,
            String tipoCirugia,
            Integer ojoId,
            String ojo,
            LocalDate fechaProgramada,
            LocalDate fechaRealizada,
            String anestesia,
            String tecnica,
            String incidencias,
            String lenteIntraocular,
            String estado
    ) {
    }
}
