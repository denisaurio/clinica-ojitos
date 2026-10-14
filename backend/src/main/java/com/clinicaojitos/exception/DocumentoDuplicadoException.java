package com.clinicaojitos.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

/**
 * Se intenta registrar un DNI ya existente (regla RF1.2).
 */
@ResponseStatus(HttpStatus.CONFLICT)
public class DocumentoDuplicadoException extends RuntimeException {

    private static final long serialVersionUID = 1L;

    public DocumentoDuplicadoException(String mensaje) {
        super(mensaje);
    }

    public static String etiqueta() {
        return "Documento duplicado";
    }
}
