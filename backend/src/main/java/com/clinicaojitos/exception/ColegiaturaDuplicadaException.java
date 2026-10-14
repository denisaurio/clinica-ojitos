package com.clinicaojitos.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

/**
 * Se intenta registrar un número de colegiatura ya existente (regla RF5.2).
 */
@ResponseStatus(HttpStatus.NOT_FOUND)
public class ColegiaturaDuplicadaException extends RuntimeException {

    private static final long serialVersionUID = 1L;

    public ColegiaturaDuplicadaException(String mensaje) {
        super(mensaje);
    }

    public static String etiqueta() {
        return "Colegiatura duplicada";
    }
}
