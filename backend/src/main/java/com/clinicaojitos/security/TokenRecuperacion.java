package com.clinicaojitos.security;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.Clock;
import java.util.Base64;
import java.util.Optional;

/**
 * Token del enlace "restablecer contraseña" (RF6.4), sin tabla en la base.
 *
 * <p>Formato: {@code <usuarioId>.<venceEpochSeg>.<firma>}, donde la firma es
 * HMAC-SHA256 de {@code usuarioId.vence.hashDeLaClaveActual}. Por eso:
 * <ul>
 *   <li>vence a los {@link #MINUTOS} minutos;</li>
 *   <li>deja de servir en cuanto la contraseña cambia (es de un solo uso);</li>
 *   <li>no es un JWT ni usa la misma clave: no sirve como token de sesión.</li>
 * </ul>
 */
@Slf4j
@Component
public class TokenRecuperacion {

    public static final long MINUTOS = 30;

    private static final Base64.Encoder B64 = Base64.getUrlEncoder().withoutPadding();

    private final byte[] clave;
    private final Clock reloj;

    @Autowired
    public TokenRecuperacion(@Value("${app.jwt.secret:}") String secreto) {
        this(secreto, Clock.systemUTC());
    }

    TokenRecuperacion(String secreto, Clock reloj) {
        this.reloj = reloj;
        if (secreto == null || secreto.isBlank()) {
            this.clave = new byte[32];
            new SecureRandom().nextBytes(this.clave);
        } else {
            // Clave derivada y distinta de la del JWT.
            this.clave = sha256("recuperacion-clave:" + secreto);
        }
    }

    /** Emite un token para el usuario con su hash de contraseña actual. */
    public String emitir(Long usuarioId, String hashActual) {
        long vence = reloj.instant().getEpochSecond() + MINUTOS * 60;
        String base = usuarioId + "." + vence;
        return base + "." + firmar(base, hashActual);
    }

    /** Id del usuario si el token tiene buen formato y no ha vencido (aún sin verificar firma). */
    public Optional<Long> usuarioDe(String token) {
        String[] p = partes(token);
        if (p == null) return Optional.empty();
        try {
            long vence = Long.parseLong(p[1]);
            if (reloj.instant().getEpochSecond() > vence) return Optional.empty();
            return Optional.of(Long.parseLong(p[0]));
        } catch (NumberFormatException e) {
            return Optional.empty();
        }
    }

    /** {@code true} si la firma corresponde al hash de contraseña actual del usuario. */
    public boolean esValido(String token, String hashActual) {
        if (usuarioDe(token).isEmpty() || hashActual == null) return false;
        String[] p = partes(token);
        String esperada = firmar(p[0] + "." + p[1], hashActual);
        return MessageDigest.isEqual(
                esperada.getBytes(StandardCharsets.US_ASCII),
                p[2].getBytes(StandardCharsets.US_ASCII));
    }

    private static String[] partes(String token) {
        if (token == null) return null;
        String[] p = token.trim().split("\\.");
        return p.length == 3 && !p[2].isEmpty() ? p : null;
    }

    private String firmar(String base, String hashActual) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(clave, "HmacSHA256"));
            return B64.encodeToString(mac.doFinal(
                    (base + "." + hashActual).getBytes(StandardCharsets.UTF_8)));
        } catch (GeneralSecurityException e) {
            throw new IllegalStateException("HmacSHA256 no disponible", e);
        }
    }

    private static byte[] sha256(String texto) {
        try {
            return MessageDigest.getInstance("SHA-256").digest(texto.getBytes(StandardCharsets.UTF_8));
        } catch (GeneralSecurityException e) {
            throw new IllegalStateException("SHA-256 no disponible", e);
        }
    }
}
