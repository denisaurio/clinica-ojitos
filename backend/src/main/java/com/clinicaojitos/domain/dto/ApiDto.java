package com.clinicaojitos.domain.dto;

import java.time.LocalDateTime;
import java.util.Map;

/**
 * Payloads generales: verificación del estado de la API y envoltorio de error.
 */
public final class ApiDto {

    private ApiDto() {
    }

    /** Respuesta de GET /api/v1/estado (Fase 4, APF1). */
    public record Estado(
            String aplicacion,
            String version,
            String estado,
            String fase,
            LocalDateTime fechaServidor,
            Map<String, Object> modulos
    ) {
    }
}
