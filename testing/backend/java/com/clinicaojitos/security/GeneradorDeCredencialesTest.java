package com.clinicaojitos.security;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

/** Las contraseñas aleatorias se pueden copiar a mano sin confundir letras. */
@DisplayName("Generador de contraseñas aleatorias")
class GeneradorDeCredencialesTest {

    private final GeneradorDeCredenciales generador = new GeneradorDeCredenciales();

    @Test
    @DisplayName("12 caracteres, con mayúscula, minúscula, dígito y símbolo, sin 0 O 1 l I o")
    void sinCaracteresAmbiguos() {
        for (int i = 0; i < 500; i++) {
            revisar(generador.nuevaPassword());
        }
    }

    private static void revisar(String clave) {
        assertThat(clave).hasSize(12);
        assertThat(clave).doesNotContainAnyWhitespaces();
        assertThat(clave.chars().anyMatch(Character::isUpperCase)).isTrue();
        assertThat(clave.chars().anyMatch(Character::isLowerCase)).isTrue();
        assertThat(clave.chars().anyMatch(Character::isDigit)).isTrue();
        assertThat(clave).containsAnyOf("!", "@", "#", "$", "%", "&", "*", "?");
        assertThat(clave).doesNotContain("0", "O", "1", "l", "I", "o");
    }
}
