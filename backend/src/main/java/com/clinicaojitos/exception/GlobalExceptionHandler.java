package com.clinicaojitos.exception;

import com.clinicaojitos.security.SecurityUtils;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.ConstraintViolationException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.web.HttpMediaTypeNotSupportedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.servlet.NoHandlerFoundException;

import java.time.LocalDateTime;
import java.util.stream.Collectors;

/**
 * Manejador global de excepciones.
 *
 * <p>Convierte cada excepción de negocio en una respuesta HTTP coherente y
 * uniforme. Los controladores nunca construyen sus propias respuestas de error.
 */
@Slf4j
@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(RecursoNoEncontradoException.class)
    public ResponseEntity<ApiErrorResponse> recursoNoEncontrado(
            RecursoNoEncontradoException ex, HttpServletRequest request) {
        return construir(HttpStatus.NOT_FOUND, ex.getMessage(), request);
    }

    @ExceptionHandler({DocumentoDuplicadoException.class, ColegiaturaDuplicadaException.class,
            CruceDeHorarioException.class})
    public ResponseEntity<ApiErrorResponse> conflicto(RuntimeException ex, HttpServletRequest request) {
        return construir(HttpStatus.CONFLICT, ex.getMessage(), request);
    }

    @ExceptionHandler(CredencialesInvalidasException.class)
    public ResponseEntity<ApiErrorResponse> credencialesInvalidas(
            CredencialesInvalidasException ex, HttpServletRequest request) {
        return construir(HttpStatus.UNAUTHORIZED, ex.getMessage(), request);
    }

    @ExceptionHandler({AccesoDenegadoException.class, AccessDeniedException.class})
    public ResponseEntity<ApiErrorResponse> accesoDenegado(RuntimeException ex, HttpServletRequest request) {
        return construir(HttpStatus.FORBIDDEN,
                ex.getMessage() == null ? "Su rol no tiene permiso para esta operación." : ex.getMessage(),
                request);
    }

    @ExceptionHandler(ArchivoInvalidoException.class)
    public ResponseEntity<ApiErrorResponse> archivoInvalido(
            ArchivoInvalidoException ex, HttpServletRequest request) {
        return construir(HttpStatus.BAD_REQUEST, ex.getMessage(), request);
    }

    @ExceptionHandler(OperacionInvalidaException.class)
    public ResponseEntity<ApiErrorResponse> operacionInvalida(
            OperacionInvalidaException ex, HttpServletRequest request) {
        return construir(HttpStatus.BAD_REQUEST, ex.getMessage(), request);
    }

    /** Validación del cuerpo de la petición (@Valid en los DTO de entrada). */
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiErrorResponse> validacion(
            MethodArgumentNotValidException ex, HttpServletRequest request) {
        String detalle = ex.getBindingResult().getFieldErrors().stream()
                .map(f -> f.getField() + ": " + f.getDefaultMessage())
                .collect(Collectors.joining("; "));
        return construir(HttpStatus.BAD_REQUEST, detalle, request);
    }

    @ExceptionHandler(ConstraintViolationException.class)
    public ResponseEntity<ApiErrorResponse> violacion(
            ConstraintViolationException ex, HttpServletRequest request) {
        String detalle = ex.getConstraintViolations().stream()
                .map(v -> v.getPropertyPath() + ": " + v.getMessage())
                .collect(Collectors.joining("; "));
        return construir(HttpStatus.BAD_REQUEST, detalle, request);
    }

    /**
     * Viola una restricción de unicidad o de clave foránea en la base de datos.
     * Es la red de seguridad detrás de RF1.2, RF3.2 y RF5.2: si dos peticiones
     * concurrentesFTA atraviesan la validación del servicio, la base de datos
     * sigue siendo la última barrera.
     */
    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<ApiErrorResponse> integridad(
            DataIntegrityViolationException ex, HttpServletRequest request) {
        String mensaje = "La operación infringe una restricción de integridad de datos.";
        String causa = causaRaiz(ex);
        if (causa != null) {
            if (causa.contains("uq_paciente_documento")) {
                mensaje = "Este documento de identidad ya está registrado en el sistema.";
            } else if (causa.contains("uq_oftalmo_colegiatura")) {
                mensaje = "Este número de colegiatura ya está registrado.";
            } else if (causa.contains("uq_cita_agenda")) {
                mensaje = "El oftalmólogo ya tiene una cita registrada en ese horario.";
            } else if (causa.contains("uq_horario_bloque")) {
                mensaje = "Ese bloque horario ya está configurado para este profesional.";
            }
        }
        return construir(HttpStatus.CONFLICT, mensaje, request);
    }

    /**
     * El cliente envió la petición con un Content-Type que la API no acepta.
     * Suele ocurrir al enviar el cuerpo como texto plano en vez de JSON.
     */
    @ExceptionHandler(HttpMediaTypeNotSupportedException.class)
    public ResponseEntity<ApiErrorResponse> tipoDeMedioNoSoportado(
            HttpMediaTypeNotSupportedException ex, HttpServletRequest request) {
        return construir(HttpStatus.UNSUPPORTED_MEDIA_TYPE,
                "El cuerpo de la petición debe enviarse en formato application/json.",
                request);
    }

    /** El JSON recibido está mal formado o le faltan campos obligatorios. */
    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<ApiErrorResponse> cuerpoIlegible(
            HttpMessageNotReadableException ex, HttpServletRequest request) {
        return construir(HttpStatus.BAD_REQUEST,
                "El cuerpo de la petición no es un JSON válido.", request);
    }

    @ExceptionHandler(AuthenticationException.class)
    public ResponseEntity<ApiErrorResponse> autenticacion(
            AuthenticationException ex, HttpServletRequest request) {
        return construir(HttpStatus.UNAUTHORIZED,
                "Usuario o contraseña incorrectos.", request);
    }

    @ExceptionHandler(NoHandlerFoundException.class)
    public ResponseEntity<ApiErrorResponse> rutaNoEncontrada(
            NoHandlerFoundException ex, HttpServletRequest request) {
        return construir(HttpStatus.NOT_FOUND,
                "El recurso solicitado no existe en la API.", request);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiErrorResponse> errorInesperado(
            Exception ex, HttpServletRequest request) {
        log.error("Error no controlado en {} {}", request.getMethod(), request.getRequestURI(), ex);
        return construir(HttpStatus.INTERNAL_SERVER_ERROR,
                "Ocurrió un error inesperado. Intente nuevamente.", request);
    }

    private String causaRaiz(Throwable ex) {
        Throwable actual = ex;
        while (actual != null) {
            if (actual.getMessage() != null) {
                return actual.getMessage();
            }
            actual = actual.getCause();
        }
        return null;
    }

    private ResponseEntity<ApiErrorResponse> construir(
            HttpStatus status, String mensaje, HttpServletRequest request) {
        if (status.is5xxServerError()) {
            log.error("{} {} -> {}", request.getMethod(), request.getRequestURI(), mensaje);
        }
        ApiErrorResponse cuerpo = new ApiErrorResponse(
                LocalDateTime.now(),
                status.value(),
                status.getReasonPhrase(),
                mensaje,
                request.getRequestURI());
        return ResponseEntity.status(status).body(cuerpo);
    }
}
