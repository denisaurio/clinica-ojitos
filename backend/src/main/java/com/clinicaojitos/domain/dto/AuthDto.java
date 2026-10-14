package com.clinicaojitos.domain.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.time.LocalDateTime;

/**
 * Contratos de autenticación (RF-06).
 */
public final class AuthDto {

    private AuthDto() {
    }

    /** Solicitud de inicio de sesión. */
    public record LoginRequest(
            @NotBlank(message = "El usuario es obligatorio")
            String username,

            @NotBlank(message = "La contraseña es obligatoria")
            @Size(min = 6, message = "La contraseña debe tener al menos 6 caracteres")
            String password
    ) {
    }

    /** Solicitud de renovación del token. */
    public record RefreshRequest(@NotBlank String refreshToken) {
    }

    /** Recuperación de contraseña por correo institucional. */
    public record RecuperarClaveRequest(
            @NotBlank(message = "El correo es obligatorio")
            @Email(message = "Debe indicar un correo válido")
            String email
    ) {
    }

    /** Token emitido tras una autenticación correcta. */
    public record TokenResponse(
            String accessToken,
            String tokenType,
            long expiresIn,
            Long id,
            String username,
            String nombreCompleto,
            String email,
            String rol
    ) {
    }

    /** Perfil del usuario autenticado. */
    public record PerfilResponse(
            Long id,
            String username,
            String nombreCompleto,
            String email,
            String rol,
            boolean activo,
            LocalDateTime ultimoAcceso
    ) {
    }
}
