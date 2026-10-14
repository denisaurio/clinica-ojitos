package com.clinicaojitos.security;

import com.clinicaojitos.domain.entity.Usuario;
import com.clinicaojitos.domain.repository.UsuarioRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

/**
 * Escribe los cambios de la cuenta de acceso en su propia transacción.
 *
 * <p>Es un requisito de la regla RF6.2. Cuando una contraseña es incorrecta,
 * {@code AuthService} incrementa el contador y a continuación lanza la
 * excepción de error. Como esa excepción es de tipo {@code RuntimeException},
 * la transacción de la petición se revertiría y el contador volvería a cero:
 * la cuenta nunca llegaría a bloquearse.
 *
 * <p>Al ejecutar estos cambios con {@code REQUIRES_NEW} en una transacción
 * aparte, el contador se confirma aunque la petición termine con error.
 */
@Service
@RequiredArgsConstructor
public class RegistroAccesoService {

    private final UsuarioRepository usuarioRepository;
    private final PasswordEncoder passwordEncoder;

    /**
     * Suma un intento fallido y devuelve el total acumulado.
     * A partir de 3 la cuenta queda bloqueada de forma preventiva.
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public int sumarIntentoFallido(Long usuarioId) {
        Usuario usuario = usuarioRepository.findById(usuarioId).orElse(null);
        if (usuario == null) {
            return 0;
        }

        int intentos = (usuario.getIntentosFallidos() == null ? 0 : usuario.getIntentosFallidos()) + 1;
        usuario.setIntentosFallidos(intentos);
        usuarioRepository.save(usuario);

        return intentos;
    }

    /** Deja la cuenta limpia tras un inicio de sesión correcto. */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void registrarAccesoExitoso(Long usuarioId) {
        usuarioRepository.findById(usuarioId).ifPresent(usuario -> {
            usuario.setIntentosFallidos(0);
            usuario.setUltimoAcceso(LocalDateTime.now());
            usuarioRepository.save(usuario);
        });
    }

    /** Reactiva una cuenta bloqueada o desactivada. */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void desbloquear(Long usuarioId) {
        usuarioRepository.findById(usuarioId).ifPresent(usuario -> {
            usuario.setIntentosFallidos(0);
            usuario.setActivo(Boolean.TRUE);
            usuarioRepository.save(usuario);
        });
    }

    /**
     * Sustituye la contraseña de una cuenta.
     *
     * <p>Va en transacción propia porque se invoca desde
     * {@code AuthService.cambiarPassword}, que puede terminar con una
     * excepción: el cambio debe confirmar o revertirse entero.
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void cambiarPassword(Long usuarioId, String nuevaPassword) {
        Usuario usuario = usuarioRepository.findById(usuarioId).orElseThrow();
        usuario.setPasswordHash(passwordEncoder.encode(nuevaPassword));
        usuario.setIntentosFallidos(0);
        usuarioRepository.save(usuario);
    }
}