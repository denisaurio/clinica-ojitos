package com.clinicaojitos.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

/**
 * El archivo adjunto no cumple el formato o el tamaño permitido.
 */
@ResponseStatus(HttpStatus.BAD_REQUEST)
public class ArchivoInvalidoException extends RuntimeException {

    private static final long serialVersionUID = 1L;

    public ArchivoInvalidoException(String mensaje) {
        super(mensaje);
    }

    public static String etiqueta() {
        return "Archivo inválido";
    }
}
