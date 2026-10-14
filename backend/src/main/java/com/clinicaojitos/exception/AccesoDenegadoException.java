package com.clinicaojitos.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

/**
 * El usuario autenticado no tiene permiso para la operación solicitada.
 */
@ResponseStatus(HttpStatus.FORBIDDEN)
public class AccesoDenegadoException extends RuntimeException {

    private static final long serialVersionUID = 1L;

    public AccesoDenegadoException(String mensaje) {
        super(mensaje);
    }

    public static String etiqueta() {
        return "Acceso denegado";
    }
}
