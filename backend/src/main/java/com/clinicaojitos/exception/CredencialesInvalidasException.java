package com.clinicaojitos.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

/**
 * El usuario o la contraseña no coinciden, o la cuenta está bloqueada tras 3 intentos (regla RF6.2).
 */
@ResponseStatus(HttpStatus.UNAUTHORIZED)
public class CredencialesInvalidasException extends RuntimeException {

    private static final long serialVersionUID = 1L;

    public CredencialesInvalidasException(String mensaje) {
        super(mensaje);
    }

    public static String etiqueta() {
        return "Credenciales inválidas";
    }
}
