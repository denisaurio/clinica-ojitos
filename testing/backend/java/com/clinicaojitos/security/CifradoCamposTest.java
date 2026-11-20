package com.clinicaojitos.security;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.Base64;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/** RNF-01 — cifrado AES-GCM de los textos clínicos en reposo. */
@DisplayName("CifradoCampos — textos clínicos cifrados en la base")
class CifradoCamposTest {

    private static final String CLAVE = Base64.getEncoder().encodeToString(new byte[32]);
    private static final String OTRA_CLAVE = Base64.getEncoder().encodeToString("x".repeat(32).getBytes());

    @Test
    @DisplayName("Cifra y descifra devolviendo el texto original")
    void idaYVuelta() {
        CifradoCampos c = new CifradoCampos(CLAVE);
        String guardado = c.cifrar("Paciente refiere visión borrosa en OD");

        assertThat(guardado).startsWith(CifradoCampos.PREFIJO).doesNotContain("visión");
        assertThat(c.descifrar(guardado)).isEqualTo("Paciente refiere visión borrosa en OD");
    }

    @Test
    @DisplayName("El mismo texto se guarda distinto cada vez (IV aleatorio)")
    void ivAleatorio() {
        CifradoCampos c = new CifradoCampos(CLAVE);
        assertThat(c.cifrar("Alergia a la penicilina")).isNotEqualTo(c.cifrar("Alergia a la penicilina"));
    }

    @Test
    @DisplayName("Los datos antiguos en texto plano se leen tal cual")
    void datoAntiguo() {
        assertThat(new CifradoCampos(CLAVE).descifrar("Glaucoma de ángulo abierto")).isEqualTo("Glaucoma de ángulo abierto");
    }

    @Test
    @DisplayName("Con otra clave no se puede leer (y no devuelve basura)")
    void otraClave() {
        String guardado = new CifradoCampos(CLAVE).cifrar("Fondo de ojo normal");
        assertThatThrownBy(() -> new CifradoCampos(OTRA_CLAVE).descifrar(guardado))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("no coincide");
    }

    @Test
    @DisplayName("Sin clave no cifra (desarrollo local) y una clave de otro tamaño se rechaza")
    void sinClaveYClaveInvalida() {
        assertThat(new CifradoCampos("").cifrar("texto")).isEqualTo("texto");
        assertThatThrownBy(() -> new CifradoCampos(Base64.getEncoder().encodeToString(new byte[16])))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("32 bytes");
    }

    @Test
    @DisplayName("Los nulos se mantienen nulos")
    void nulos() {
        CifradoCampos c = new CifradoCampos(CLAVE);
        assertThat(c.cifrar(null)).isNull();
        assertThat(c.descifrar(null)).isNull();
    }
}
