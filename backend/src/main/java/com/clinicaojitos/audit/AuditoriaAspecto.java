package com.clinicaojitos.audit;

import com.clinicaojitos.security.SecurityUtils;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.aspectj.lang.JoinPoint;
import org.aspectj.lang.annotation.AfterReturning;
import org.aspectj.lang.annotation.AfterThrowing;
import org.aspectj.lang.annotation.Aspect;
import org.aspectj.lang.annotation.Before;
import org.springframework.stereotype.Component;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;
import org.springframework.web.multipart.MultipartFile;

import java.util.Arrays;
import java.util.stream.Collectors;

/**
 * Aspecto que deja constancia en la bitácora de las operaciones sensibles:
 * accesos al historial clínico y a los datos personales.
 *
 * <p>Se activa únicamente en los métodos anotados con {@link Auditado}.
 */
@Aspect
@Component
@RequiredArgsConstructor
public class AuditoriaAspecto {

    private final AuditoriaService auditoriaService;

    @Before("@annotation(auditado)")
    public void antesDeEjecutar(JoinPoint punto, Auditado auditado) {
        String username = SecurityUtils.usernameActual().orElse("sistema");
        HttpServletRequest request = peticionActual();

        auditoriaService.registrar(
                username,
                auditado.accion(),
                auditado.recurso(),
                idDesdeArgumentos(punto),
                auditado.descripcion(),
                ip(request),
                navegador(request),
                "EXITOSO");
    }

    @AfterThrowing(pointcut = "@annotation(auditado)", throwing = "error")
    public void trasError(JoinPoint punto, Auditado auditado, Exception error) {
        HttpServletRequest request = peticionActual();
        auditoriaService.registrar(
                SecurityUtils.usernameActual().orElse("sistema"),
                auditado.accion(),
                auditado.recurso(),
                idDesdeArgumentos(punto),
                auditado.descripcion() + " — falló: " + error.getMessage(),
                ip(request),
                navegador(request),
                "FALLIDO");
    }

    private Long idDesdeArgumentos(JoinPoint punto) {
        for (Object arg : punto.getArgs()) {
            if (arg instanceof MultipartFile[]) {
                return null;
            }
        }
        return Arrays.stream(punto.getArgs())
                .filter(a -> a instanceof Long || a instanceof Integer)
                .map(a -> a instanceof Long l ? l : Long.valueOf(((Integer) a).longValue()))
                .findFirst()
                .orElse(null);
    }

    private HttpServletRequest peticionActual() {
        var atributos = RequestContextHolder.getRequestAttributes();
        return (atributos instanceof ServletRequestAttributes sra) ? sra.getRequest() : null;
    }

    private String ip(HttpServletRequest request) {
        if (request == null) return null;
        String forwarded = request.getHeader("X-Forwarded-For");
        if (forwarded != null && !forwarded.isBlank()) {
            return forwarded.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }

    private String navegador(HttpServletRequest request) {
        return request == null ? null : request.getHeader("User-Agent");
    }
}
