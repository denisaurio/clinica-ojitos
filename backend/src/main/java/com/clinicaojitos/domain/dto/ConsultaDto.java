package com.clinicaojitos.domain.dto;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Contratos del historial médico oftalmológico (RF-02).
 */
public final class ConsultaDto {

    private ConsultaDto() {
    }

    /** Registro de una consulta oftalmológica. */
    public record Request(
            @NotNull(message = "El paciente es obligatorio")
            Long pacienteId,

            Long oftalmologoId,

            Integer sedeId,

            LocalDateTime fecha,

            @NotNull(message = "El tipo de consulta es obligatorio")
            Integer tipoConsultaId,

            @Size(max = 10, message = "Formato de agudeza visual, por ejemplo 20/25")
            String agudezaOd,

            @Size(max = 10, message = "Formato de agudeza visual, por ejemplo 20/25")
            String agudezaOi,

            @DecimalMin(value = "0", message = "La presión intraocular no puede ser negativa")
            @DecimalMax(value = "80", message = "Valor de presión intraocular fuera de rango")
            Double pioOd,

            @DecimalMin(value = "0", message = "La presión intraocular no puede ser negativa")
            @DecimalMax(value = "80", message = "Valor de presión intraocular fuera de rango")
            Double pioOi,

            @Size(max = 80)
            String pupilas,

            @Size(max = 3000)
            String biomicroscopia,

            @Size(max = 3000)
            String fondoOjo,

            @NotNull(message = "El diagnóstico es obligatorio")
            @Size(max = 500, message = "Máximo 500 caracteres")
            String diagnostico,

            @Size(max = 10, message = "Código CIE-10 de oftalmología")
            String cie10,

            @Size(max = 3000)
            String soapSubjetivo,

            @Size(max = 3000)
            String soapObjetivo,

            @Size(max = 3000)
            String soapEvaluacion,

            @Size(max = 3000)
            String soapPlan,

            @Size(max = 3000)
            String observaciones
    ) {
    }

    /** Consulta registrada. */
    public record Response(
            Long id,
            Long pacienteId,
            String pacienteNombre,
            String pacienteDocumento,
            Long oftalmologoId,
            String oftalmologoNombre,
            String subespecialidad,
            LocalDateTime fecha,
            Integer tipoConsultaId,
            String tipoConsulta,
            String agudezaOd,
            String agudezaOi,
            Double pioOd,
            Double pioOi,
            String pupilas,
            String biomicroscopia,
            String fondoOjo,
            String diagnostico,
            String cie10,
            String soapSubjetivo,
            String soapObjetivo,
            String soapEvaluacion,
            String soapPlan,
            String observaciones,
            int adjuntos
    ) {
    }

    /** Punto de la serie temporal para la gráfica de evolución (pantalla 3.6.4). */
    public record Evolución(
            LocalDateTime fecha,
            Double pioOd,
            Double pioOi,
            String agudezaOd,
            String agudezaOi,
            String diagnostico
    ) {
    }

    /** Resumen clínico del encabezado del portal del paciente. */
    public record DiagnosticoVigente(
            String diagnostico,
            LocalDateTime ultimaActualizacion,
            String ojo,
            String estado
    ) {
    }

    /** Adjuntar un estudio diagnóstico (RF2.4). */
    public record ExamenRequest(
            @NotNull(message = "El tipo de examen es obligatorio")
            Integer tipoExamenId,

            @NotNull(message = "El archivo es obligatorio")
            String archivoUrl,

            String nombreArchivo,
            String mimeType,

            @Size(max = 500)
            String descripcion
    ) {
    }

    /** Examen adjunto. */
    public record ExamenResponse(
            Long id,
            Long consultaId,
            Integer tipoExamenId,
            String tipoExamen,
            String archivoUrl,
            String nombreArchivo,
            String mimeType,
            String descripcion,
            LocalDateTime fecha
    ) {
    }
}
