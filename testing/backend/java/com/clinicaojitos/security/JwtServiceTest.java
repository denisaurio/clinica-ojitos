package com.clinicaojitos.security;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Módulo AUTH — RF-06 / RNF-01.
 * El JWT debe firmarse bien, caducar y no llevar datos clínicos.
 */
@DisplayName("JwtService — RF-06")
class JwtServiceTest {

    private static final String SECRETO = "clave-de-pruebas-con-mas-de-treinta-y-dos-caracteres-0123456789";

    private JwtService servicio(String secreto, long minutos) {
        return new JwtService(secreto, minutos);
    }

    @Test
    @DisplayName("Un token emitido es válido y devuelve usuario, id y rol")
    void tokenIdaYVuelta() {
        JwtService jwt = servicio(SECRETO, 60);
        String token = jwt.generarToken(7L, "dra.rostova", "OFTALMOLOGO");

        assertThat(jwt.esValido(token)).isTrue();
        assertThat(jwt.extraerUsername(token)).isEqualTo("dra.rostova");
        assertThat(jwt.extraerUsuarioId(token)).isEqualTo(7L);
        assertThat(jwt.extraerRol(token)).isEqualTo("OFTALMOLOGO");
    }

    @Test
    @DisplayName("El token NO contiene datos clínicos: solo identidad, rol y fechas")
    void tokenSinDatosClinicos() throws Exception {
        JwtService jwt = servicio(SECRETO, 60);
        String token = jwt.generarToken(7L, "paciente", "PACIENTE");

        String payload = new String(Base64.getUrlDecoder().decode(token.split("\\.")[1]),
                StandardCharsets.UTF_8);
        Map<String, Object> claims = new ObjectMapper().readValue(payload,
                new TypeReference<Map<String, Object>>() {});

        assertThat(claims.keySet()).containsExactlyInAnyOrder("sub", "uid", "rol", "iat", "exp");
    }

    @Test
    @DisplayName("Un token alterado se rechaza")
    void tokenAlterado() {
        JwtService jwt = servicio(SECRETO, 60);
        String token = jwt.generarToken(1L, "admin", "ADMINISTRADOR");
        String alterado = token.substring(0, token.length() - 2) + "xx";

        assertThat(jwt.esValido(alterado)).isFalse();
    }

    @Test
    @DisplayName("Un token firmado con otra clave se rechaza")
    void tokenOtraClave() {
        String token = servicio(SECRETO, 60).generarToken(1L, "admin", "ADMINISTRADOR");
        JwtService otro = servicio("otra-clave-distinta-con-mas-de-treinta-y-dos-caracteres-abcdef", 60);

        assertThat(otro.esValido(token)).isFalse();
    }

    @Test
    @DisplayName("Un token caducado se rechaza")
    void tokenCaducado() {
        JwtService jwt = servicio(SECRETO, -5);
        String token = jwt.generarToken(1L, "admin", "ADMINISTRADOR");

        assertThat(jwt.esValido(token)).isFalse();
    }

    @Test
    @DisplayName("Un secreto de menos de 32 caracteres impide arrancar")
    void secretoCorto() {
        assertThatThrownBy(() -> servicio("corto", 60))
                .isInstanceOf(IllegalStateException.class);
    }

    @Test
    @DisplayName("Basura que no es un JWT se rechaza sin lanzar excepción")
    void basura() {
        assertThat(servicio(SECRETO, 60).esValido("esto-no-es-un-token")).isFalse();
    }
}
