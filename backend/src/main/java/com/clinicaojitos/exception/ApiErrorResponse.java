package com.clinicaojitos.exception;

import java.time.LocalDateTime;

/**
 * Forma única de las respuestas de error de la API.
 * El frontend depende de este contrato: el campo `message` es el que se
 * muestra junto al campo del formulario.
 */
public record ApiErrorResponse(
        LocalDateTime timestamp,
        int status,
        String error,
        String message,
        String path
) {
}
