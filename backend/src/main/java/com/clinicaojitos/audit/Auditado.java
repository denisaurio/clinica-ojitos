package com.clinicaojitos.audit;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * Marca un método cuyo ejecución debe quedar registrada en la bitácora.
 */
@Target(ElementType.METHOD)
@Retention(RetentionPolicy.RUNTIME)
public @interface Auditado {

    /** Acción registrada: CREAR, ACTUALIZAR, VER_HISTORIAL, ELIMINAR... */
    String accion();

    /** Recurso afectado: PACIENTE, CONSULTA, CITA, TRATAMIENTO... */
    String recurso() default "";

    /** Descripción legible del motivo de la auditoría. */
    String descripcion() default "";
}
