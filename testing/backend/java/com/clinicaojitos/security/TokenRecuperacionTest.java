package com.clinicaojitos.security;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;

import static org.assertj.core.api.Assertions.assertThat;

/** RF6.4 — token del enlace de recuperación de contraseña. */
@DisplayName("Token de recuperación de contraseña (RF6.4)")
class TokenRecuperacionTest {

    private static final String SECRETO = "clave-de-pruebas-con-mas-de-treinta-y-dos-caracteres";
    private static final Instant AHORA = Instant.parse("2026-11-19T15:00:00Z");

    private TokenRecuperacion en(Instant instante) {
        return new TokenRecuperacion(SECRETO, Clock.fixed(instante, ZoneOffset.UTC));
    }

    @Test
    @DisplayName("Un token recién emitido es válido para ese usuario y esa clave")
    void valido() {
        String token = en(AHORA).emitir(7L, "$2a$hash-actual");
        assertThat(en(AHORA).usuarioDe(token)).contains(7L);
        assertThat(en(AHORA).esValido(token, "$2a$hash-actual")).isTrue();
    }

    @Test
    @DisplayName("Vence a los 30 minutos")
    void vence() {
        String token = en(AHORA).emitir(7L, "h");
        assertThat(en(AHORA.plus(Duration.ofMinutes(29))).esValido(token, "h")).isTrue();
        assertThat(en(AHORA.plus(Duration.ofMinutes(31))).esValido(token, "h")).isFalse();
    }

    @Test
    @DisplayName("Deja de servir cuando la contraseña cambia (un solo uso)")
    void unSoloUso() {
        String token = en(AHORA).emitir(7L, "hash-viejo");
        assertThat(en(AHORA).esValido(token, "hash-nuevo")).isFalse();
    }

    @Test
    @DisplayName("No acepta tokens alterados, de otro usuario o de otra clave de servidor")
    void alterado() {
        String token = en(AHORA).emitir(7L, "h");
        String otroUsuario = "8" + token.substring(token.indexOf('.'));
        assertThat(en(AHORA).esValido(otroUsuario, "h")).isFalse();
        assertThat(new TokenRecuperacion("otra-clave-de-servidor-con-mas-de-32-caracteres",
                Clock.fixed(AHORA, ZoneOffset.UTC)).esValido(token, "h")).isFalse();
        assertThat(en(AHORA).esValido(token + "x", "h")).isFalse();
    }

    @Test
    @DisplayName("Rechaza basura sin lanzar excepciones")
    void basura() {
        TokenRecuperacion t = en(AHORA);
        assertThat(t.esValido(null, "h")).isFalse();
        assertThat(t.esValido("", "h")).isFalse();
        assertThat(t.esValido("a.b.c", "h")).isFalse();
        assertThat(t.esValido("1.2", "h")).isFalse();
    }
}
