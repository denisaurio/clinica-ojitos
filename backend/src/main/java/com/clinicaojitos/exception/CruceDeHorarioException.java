package com.clinicaojitos.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

/**
 * Se intenta programar una cita en un horario ya ocupado por el mismo oftalmólogo (regla RF3.2).
 */
@ResponseStatus(HttpStatus.CONFLICT)
public class CruceDeHorarioException extends RuntimeException {

    private static final long serialVersionUID = 1L;

    public CruceDeHorarioException(String mensaje) {
        super(mensaje);
    }

    public static String etiqueta() {
        return "Cruce de horario";
    }
}
