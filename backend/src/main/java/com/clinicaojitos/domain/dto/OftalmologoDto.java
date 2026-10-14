package com.clinicaojitos.domain.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

/**
 * Contratos del directorio de oftalmólogos y sus horarios (RF-05).
 */
public final class OftalmologoDto {

    private OftalmologoDto() {
    }

    /** Alta y edición de un profesional. */
    public record Request(
            @NotBlank(message = "Los nombres son obligatorios")
            @Size(max = 80)
            String nombres,

            @NotBlank(message = "Los apellidos son obligatorios")
            @Size(max = 80)
            String apellidos,

            @NotBlank(message = "El correo institucional es obligatorio")
            @Email(message = "Debe indicar un correo válido")
            String email,

            @Size(max = 30)
            String telefono,

            @NotBlank(message = "El número de colegiatura es obligatorio")
            @Pattern(regexp = "^[A-Za-z]{2,4}-?\\d{3,10}$",
                    message = "Formato de colegiatura no válido, por ejemplo COP-38472")
            String numeroColegiatura,

            /**
             * Id del catálogo de subespecialidades. Puede venir nulo si el
             * profesional escribió el nombre a mano: en ese caso se usa
             * {@link #subespecialidad}.
             */
            Integer subespecialidadId,

            /** Subespecialidad escrita a mano, cuando no está en el catálogo. */
            @Size(max = 80, message = "Máximo 80 caracteres")
            String subespecialidad,

            Integer sedeId,

            /** Sede escrita a mano, cuando no está en el catálogo. */
            @Size(max = 120, message = "Máximo 120 caracteres")
            String sede,

            String fotoUrl,
            LocalDate fechaIngreso,
            Boolean activo
    ) {
    }

    /** Ficha del profesional. */
    public record Response(
            Long id,
            String nombres,
            String apellidos,
            String nombreCompleto,
            String iniciales,
            String email,
            String telefono,
            String numeroColegiatura,
            Integer subespecialidadId,
            String subespecialidad,
            Integer sedeId,
            String sede,
            String fotoUrl,
            boolean activo,
            LocalDate fechaIngreso
    ) {
    }

    /** Bloque de la matriz de disponibilidad semanal. */
    public record HorarioRequest(
            @NotNull(message = "El día de la semana es obligatorio")
            Integer diaSemanaId,

            @NotNull(message = "La hora de inicio es obligatoria")
            LocalTime horaInicio,

            @NotNull(message = "La hora de fin es obligatoria")
            LocalTime horaFin,

            @NotNull(message = "El tipo de bloque es obligatorio")
            Integer tipoBloqueId,

            Integer sedeId,
            Boolean activo
    ) {
    }

    /** Bloque configurado. */
    public record HorarioResponse(
            Integer id,
            Integer diaSemanaId,
            String diaSemana,
            Integer ordenDia,
            LocalTime horaInicio,
            LocalTime horaFin,
            Integer tipoBloqueId,
            String tipoBloque,
            Integer sedeId,
            String sede,
            boolean activo
    ) {
    }

    /** Reemplaza la matriz completa de horarios de un profesional. */
    public record HorariosRequest(
            @NotNull(message = "La lista de horarios es obligatoria")
            List<HorarioRequest> horarios
    ) {
    }

    /** Métricas de carga asistencial del profesional (pantalla 3.6.18). */
    public record Metricas(
            long pacientesAtendidos,
            long citasSemana,
            double horasSemanales,
            long cirugiasRealizadas,
            double satisfaccionMedia
    ) {
    }

    /** Verificación en tiempo real de la colegiatura. */
    public record ColegiaturaExiste(boolean existe, String mensaje) {
    }
    /**
     * Credenciales de la cuenta recién creada.
     *
     * <p>La contraseña se devuelve <strong>una sola vez</strong>, en la
     * respuesta del alta. No existe ningún endpoint que la vuelva a mostrar,
     * porque la base solo guarda el hash BCrypt: es imposible recuperarla.
     */
    public record Credenciales(
            String username,
            String password,
            String nombreCompleto,
            String textoParaDescargar
    ) {
    }

    /**
     * Ficha del profesional junto con sus credenciales de primer ingreso.
     */
    public record AltaConCredenciales(
            Response oftalmologo,
            Credenciales credenciales
    ) {
    }

    /** Cambio voluntary de contraseña por el propio usuario. */
    public record CambioClaveRequest(
            @jakarta.validation.constraints.NotBlank(message = "La contraseña actual es obligatoria")
            String passwordActual,

            @jakarta.validation.constraints.NotBlank(message = "La nueva contraseña es obligatoria")
            @jakarta.validation.constraints.Size(min = 8, max = 100,
                    message = "La contraseña debe tener entre 8 y 100 caracteres")
            String passwordNueva
    ) {
    }
}
