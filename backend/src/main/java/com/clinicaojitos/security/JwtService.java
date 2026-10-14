package com.clinicaojitos.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.security.Keys;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Date;

/**
 * Emisión y validación de tokens JWT (RF-06).
 *
 * <p>El payload contiene únicamente identidad y rol. Nunca se incluyen datos
 * clínicos ni personales del paciente: el token viaja en el navegador y una
 * fuga expondría información sanitaria.
 */
@Slf4j
@Service
public class JwtService {

    private final SecretKey key;
    private final long expirationMinutos;

    public JwtService(
            @Value("${app.jwt.secret}") String secret,
            @Value("${app.jwt.expiration-minutes:60}") long expirationMinutos) {

        if (secret == null || secret.isBlank()) {
            // No hay clave publicada en el repositorio: por seguridad, ninguna.
            // Se genera una aleatoria para que el desarrollo local funcione, pero
            // avisar porque los tokens dejan de ser validos al reiniciar.
            byte[] aleatorio = new byte[64];
            new java.security.SecureRandom().nextBytes(aleatorio);
            this.key = Keys.hmacShaKeyFor(aleatorio);
            log.warn("""
                    ================================================================
                     JWT_SECRET no esta definido: se genero una clave aleatoria
                     para esta ejecucion. Funciona en desarrollo, pero TODOS los
                     tokens emitidos quedaran invalidos al reiniciar.
                     Para un despliegue define la variable de entorno:
                         export JWT_SECRET="$(openssl rand -base64 48)"
                    ================================================================""");
        } else if (secret.getBytes(StandardCharsets.UTF_8).length < 32) {
            throw new IllegalStateException(
                    "JWT_SECRET debe tener al menos 32 caracteres para firmar con HMAC-SHA256.");
        } else {
            this.key = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
        }

        this.expirationMinutos = expirationMinutos;
    }

    public String generarToken(Long usuarioId, String username, String rol) {
        Instant ahora = Instant.now();
        return Jwts.builder()
                .subject(username)
                .claim("uid", usuarioId)
                .claim("rol", rol)
                .issuedAt(Date.from(ahora))
                .expiration(Date.from(ahora.plus(expirationMinutos, ChronoUnit.MINUTES)))
                .signWith(key)
                .compact();
    }

    public String extraerUsername(String token) {
        return obtenerClaims(token).getSubject();
    }

    public Long extraerUsuarioId(String token) {
        Object uid = obtenerClaims(token).get("uid");
        return uid == null ? null : Long.valueOf(uid.toString());
    }

    public String extraerRol(String token) {
        Object rol = obtenerClaims(token).get("rol");
        return rol == null ? null : rol.toString();
    }

    public boolean esValido(String token) {
        try {
            return obtenerClaims(token).getExpiration().after(new Date());
        } catch (JwtException | IllegalArgumentException e) {
            log.debug("Token rechazado: {}", e.getMessage());
            return false;
        }
    }

    private Claims obtenerClaims(String token) {
        return Jwts.parser().verifyWith(key).build()
                .parseSignedClaims(token).getPayload();
    }

    public long getExpirationMinutos() {
        return expirationMinutos;
    }
}
