package com.clinicaojitos.domain.dto;

import jakarta.validation.constraints.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

/**
 * Contratos del módulo de pacientes (RF-01).
 */
public final class PacienteDto {

    private PacienteDto() {
    }

    /** Alta y edición de paciente. */
    public record Request(
            /**
             * Contraseña de acceso del portal del paciente.
             *
             * <p>Obligatoria al dar de alta: el paciente entra al sistema con
             * esta clave y debería cambiarla en su primer acceso.
             */
            @Size(min = 8, max = 100,
                    message = "La contraseña debe tener entre 8 y 100 caracteres")
            String password,

            /**
             * Nombre de usuario para entrar al portal.
             *
             * <p>Si viene vacío se usa el nombre completo del paciente. Admite
             * espacios: «denis quispe mamani» es un usuario tan válido como
             * «dquisupe».
             */
            @Size(max = 120, message = "Máximo 120 caracteres")
            String username,

            @NotBlank(message = "Los nombres son obligatorios")
            @Size(max = 80, message = "Máximo 80 caracteres")
            String nombres,

            @NotBlank(message = "Los apellidos son obligatorios")
            @Size(max = 80, message = "Máximo 80 caracteres")
            String apellidos,

            @NotBlank(message = "El documento de identidad es obligatorio")
            @Size(max = 20, message = "Máximo 20 caracteres")
            String documento,

            LocalDate fechaNacimiento,
            Integer edad,

            @Size(max = 30, message = "Máximo 30 caracteres")
            String telefono,

            @Email(message = "Debe indicar un correo válido")
            @Size(max = 150, message = "Máximo 150 caracteres")
            String email,

            @Size(max = 255, message = "Máximo 255 caracteres")
            String direccion,

            Integer tipoSeguroId,
            String tipoSeguro,

            @Pattern(regexp = "^(O\\+|A\\+|B\\+|AB\\+|O-|A-|B-|AB-)?$",
                    message = "Grupo sanguíneo no válido")
            String grupoSanguineo,

            String fotoUrl,

            @Size(max = 2000, message = "Máximo 2000 caracteres")
            String historialOcular,

            @Size(max = 2000, message = "Máximo 2000 caracteres")
            String alergias,

            Boolean activo
    ) {
    }

    /** Ficha completa del paciente. */
    public record Response(
            Long id,
            String nombres,
            String apellidos,
            String nombreCompleto,
            String iniciales,
            String documento,
            LocalDate fechaNacimiento,
            Integer edad,
            String telefono,
            String email,
            String direccion,
            Integer tipoSeguroId,
            String tipoSeguro,
            String grupoSanguineo,
            String fotoUrl,
            String historialOcular,
            String alergias,
            boolean activo,
            LocalDateTime fechaRegistro
    ) {
    }

    /** Fila de la tabla del listado, con los campos que muestra el prototipo. */
    public record Resumen(
            Long id,
            String nombreCompleto,
            String iniciales,
            String documento,
            Integer edad,
            String telefono,
            String email,
            String seguro,
            boolean activo
    ) {
    }

    /** Actividad reciente mostrada en la ficha (pantalla 3.6.3). */
    public record Actividad(
            Long id,
            String tipo,
            String descripcion,
            String profesional,
            LocalDateTime fecha
    ) {
    }

    /** Ficha con los contadores de la cabecera del perfil. */
    public record Detalle(
            Response paciente,
            long totalConsultas,
            long totalCitas,
            long tratamientosActivos,
            List<Actividad> actividadReciente
    ) {
    }

    /**
     * Ficha del paciente recién creado junto con sus credenciales de acceso.
     */
    public record AltaConCredenciales(
            Response paciente,
            CredencialesDto credenciales
    ) {
    }
}