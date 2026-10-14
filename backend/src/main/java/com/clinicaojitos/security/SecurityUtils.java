package com.clinicaojitos.security;

import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.Optional;

/**
 * Acceso al usuario autenticado desde la capa de servicio.
 *
 * <p>Se usa para decidir si un paciente puede consultar su propio historial
 * (RF-02, rol PACIENTE) y para firmar la auditoría.
 */
public final class SecurityUtils {

    private SecurityUtils() {
    }

    public static Optional<String> usernameActual() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated()) {
            return Optional.empty();
        }
        String nombre = auth.getName();
        return ("anonymousUser".equals(nombre)) ? Optional.empty() : Optional.of(nombre);
    }

    public static Optional<String> rolActual() {
        return usernameActual().flatMap(SecurityUtils::rolDe);
    }

    private static Optional<String> rolDe(String username) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null) return Optional.empty();
        return auth.getAuthorities().stream()
                .map(a -> a.getAuthority())
                .filter(a -> a.startsWith("ROLE_"))
                .map(a -> a.substring(5))
                .findFirst();
    }

    public static boolean tieneRol(String... roles) {
        Optional<String> actual = rolActual();
        if (actual.isEmpty()) return false;
        for (String r : roles) {
            if (r.equalsIgnoreCase(actual.get())) return true;
        }
        return false;
    }

    public static boolean esAdministrador() {
        return tieneRol("ADMINISTRADOR");
    }

    public static boolean esOftalmologo() {
        return tieneRol("OFTALMOLOGO");
    }

    public static boolean esPaciente() {
        return tieneRol("PACIENTE");
    }
}
