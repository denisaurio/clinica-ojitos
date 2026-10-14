package com.clinicaojitos.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

/**
 * La operación solicitada es incoherente con el estado actual del recurso.
 */
@ResponseStatus(HttpStatus.BAD_REQUEST)
public class OperacionInvalidaException extends RuntimeException {

    private static final long serialVersionUID = 1L;

    public OperacionInvalidaException(String mensaje) {
        super(mensaje);
    }

    public static String etiqueta() {
        return "Operación inválida";
    }
}
