package com.clinicaojitos.domain.service;

import com.clinicaojitos.audit.AuditoriaService;
import com.clinicaojitos.domain.dto.AuthDto;
import com.clinicaojitos.domain.entity.Usuario;
import com.clinicaojitos.domain.repository.UsuarioOftalmologoRepository;
import com.clinicaojitos.domain.repository.UsuarioRepository;
import com.clinicaojitos.exception.CredencialesInvalidasException;
import com.clinicaojitos.exception.OperacionInvalidaException;
import com.clinicaojitos.security.JwtService;
import com.clinicaojitos.security.RegistroAccesoService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

/**
 * Autenticación y control de acceso (RF-06).
 *
 * <p>Aplica la regla RF6.2: tras tres intentos fallidos consecutivos la cuenta
 * queda bloqueada de forma preventiva y el administrador debe habilitarla.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AuthService {

    /** Número máximo de intentos permitidos (RF6.2). */
    public static final int MAX_INTENTOS = 3;

    private final UsuarioRepository usuarioRepository;
    private final UsuarioOftalmologoRepository usuarioOftalmologoRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final AuditoriaService auditoriaService;
    private final RegistroAccesoService registroAccesoService;
    private final Mapeador mapeador;

    @Transactional
    public AuthDto.TokenResponse login(AuthDto.LoginRequest request, HttpServletRequest httpRequest) {
        String username = request.username() == null ? "" : request.username().trim();
        Usuario usuario = usuarioRepository.buscarPorUsernameConRol(username).orElse(null);

        if (usuario == null) {
            auditarFallo(username, "Usuario inexistente", httpRequest);
            throw new CredencialesInvalidasException(
                    "El nombre de usuario o la contraseña son incorrectos.");
        }

        if (usuario.getIntentosFallidos() != null && usuario.getIntentosFallidos() >= MAX_INTENTOS) {
            auditarFallo(username, "Cuenta bloqueada por intentos repetidos", httpRequest);
            throw new CredencialesInvalidasException(
                    "La cuenta está bloqueada temporalmente. Contacte al administrador.");
        }

        if (!Boolean.TRUE.equals(usuario.getActivo())) {
            auditarFallo(username, "Cuenta inactiva", httpRequest);
            throw new CredencialesInvalidasException("La cuenta se encuentra inactiva.");
        }

        if (!passwordEncoder.matches(request.password(), usuario.getPasswordHash())) {
            // El contador se confirma en su propia transacción: si se guardara
            // aquí, la excepción siguiente revertiria el incremento (RF6.2).
            int intentos = registroAccesoService.sumarIntentoFallido(usuario.getId());

            auditoriaService.registrar(
                    usuario.getUsername(), "LOGIN_FAIL", null, null,
                    "Credenciales incorrectas. Intento " + intentos + " de " + MAX_INTENTOS,
                    ip(httpRequest), navegador(httpRequest), "FALLIDO");

            int restantes = Math.max(0, MAX_INTENTOS - intentos);
            throw new CredencialesInvalidasException(
                    restantes > 0
                        ? "La contraseña es incorrecta. Le " + restantes
                            + (restantes == 1 ? " intento restante." : " intentos restantes.")
                        : "La contraseña es incorrecta. La cuenta quedó bloqueada tras "
                            + MAX_INTENTOS + " intentos.");
        }

        registroAccesoService.registrarAccesoExitoso(usuario.getId());

        auditoriaService.registrar(
                usuario.getUsername(), "LOGIN_OK", null, null,
                "Inicio de sesión correcto",
                ip(httpRequest), navegador(httpRequest), "EXITOSO");

        return emitirToken(usuario);
    }

    /** Reactiva una cuenta bloqueada tras demasiados intentos (RF6.2). */
    @Transactional(readOnly = true)
    public void desbloquearCuenta(String username) {
        usuarioRepository.findByUsernameIgnoreCase(username).ifPresent(u ->
                registroAccesoService.desbloquear(u.getId()));
    }

    @Transactional(readOnly = true)
    public AuthDto.TokenResponse refrescar(String token) {
        if (token == null || !jwtService.esValido(token)) {
            throw new CredencialesInvalidasException("El token no es válido o ha expirado.");
        }
        String username = jwtService.extraerUsername(token);
        Usuario usuario = usuarioRepository.buscarPorUsernameConRol(username)
                .orElseThrow(() -> new CredencialesInvalidasException("El usuario ya no existe."));
        return emitirToken(usuario);
    }

    @Transactional(readOnly = true)
    public AuthDto.PerfilResponse perfil(String username) {
        Usuario usuario = usuarioRepository.buscarPorUsernameConRol(username)
                .orElseThrow(() -> new CredencialesInvalidasException("El usuario no existe."));
        return mapeador.aPerfil(usuario);
    }

    /**
     * Recuperación de contraseña (RF6.4).
     *
     * <p>Por seguridad responde siempre con éxito: no debe revelar qué correos
     * están registrados en el sistema.
     */
    @Transactional(readOnly = true)
    public void solicitarRecuperacion(String email) {
        usuarioRepository.findByEmailIgnoreCase(email).ifPresentOrElse(
                u -> log.info("Recuperación solicitada para el usuario {}", u.getUsername()),
                () -> log.info("Recuperación solicitada para un correo no registrado"));
    }

    /** Identificador del oftalmólogo asociado a la cuenta, si lo hay. */
    @Transactional(readOnly = true)
    public Long oftalmologoIdDe(String username) {
        return usuarioRepository.findByUsernameIgnoreCase(username)
                .flatMap(u -> usuarioOftalmologoRepository.findByUsuarioId(u.getId()))
                .map(v -> v.getOftalmologoId())
                .orElse(null);
    }

    private void auditarFallo(String username, String motivo, HttpServletRequest request) {
        auditoriaService.registrar(
                username, "LOGIN_FAIL", null, null, motivo,
                ip(request), navegador(request), "FALLIDO");
    }

    private AuthDto.TokenResponse emitirToken(Usuario usuario) {
        String token = jwtService.generarToken(
                usuario.getId(), usuario.getUsername(), usuario.getCodigoRol());
        return new AuthDto.TokenResponse(
                token,
                "Bearer",
                jwtService.getExpirationMinutos() * 60,
                usuario.getId(),
                usuario.getUsername(),
                mapeador.aPerfil(usuario).nombreCompleto(),
                usuario.getEmail(),
                usuario.getCodigoRol());
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

    /**
     * Cambio de contraseña por el propio usuario (RF-06).
     *
     * <p>Exige la contraseña actual: así, si alguien se deja una sesión abierta
     * en un equipo compartido, no puede dejar la cuenta bloqueada con una clave
     * que el propietario no conoce.
     *
     * <p>Va en su propia transacción porque la validación se hace en la misma
     * operación que el guardado: si fallara, el cambio debe revertirse entero.
     */
    @Transactional
    public void cambiarPassword(String username, String passwordActual, String passwordNueva) {
        Usuario usuario = usuarioRepository.buscarPorUsernameConRol(username)
                .orElseThrow(() -> new CredencialesInvalidasException("El usuario no existe."));

        if (!passwordEncoder.matches(passwordActual, usuario.getPasswordHash())) {
            throw new CredencialesInvalidasException(
                    "La contraseña actual no es correcta.");
        }

        if (passwordEncoder.matches(passwordNueva, usuario.getPasswordHash())) {
            throw new OperacionInvalidaException(
                    "La nueva contraseña debe ser distinta de la actual.");
        }

        registroAccesoService.cambiarPassword(usuario.getId(), passwordNueva);
    }
}