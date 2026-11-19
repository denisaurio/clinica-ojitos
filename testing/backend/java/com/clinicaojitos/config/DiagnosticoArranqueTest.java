package com.clinicaojitos.config;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

/** El diagnóstico de arranque nunca imprime secretos y lee bien la URL JDBC. */
@DisplayName("DiagnosticoArranque — resumen de configuración")
class DiagnosticoArranqueTest {

    @Test
    @DisplayName("Extrae host, puerto y base de la URL JDBC")
    void describeJdbc() {
        assertThat(DiagnosticoArranque.describirJdbc(
                "jdbc:mysql://pqexrstmlilcznhvxmml4iso:3306/clinica_ojitos?useSSL=false"))
                .isEqualTo("host=pqexrstmlilcznhvxmml4iso puerto=3306 base=clinica_ojitos");
        assertThat(DiagnosticoArranque.describirJdbc("jdbc:mysql://mysql/clinica_ojitos"))
                .isEqualTo("host=mysql puerto=3306 base=clinica_ojitos");
    }

    @Test
    @DisplayName("Reporta la causa raíz de la excepción")
    void causaRaiz() {
        var error = new IllegalStateException("arriba",
                new RuntimeException("medio", new java.net.ConnectException("Connection refused")));
        assertThat(DiagnosticoArranque.causaRaiz(error)).isEqualTo("ConnectException: Connection refused");
    }

    @Test
    @DisplayName("El resumen no contiene el valor de ninguna clave")
    void noImprimeSecretos() {
        String texto = DiagnosticoArranque.resumen("PRUEBA", null, null);
        assertThat(texto).contains("DB_URL", "JWT_SECRET", "DB_PASSWORD");
        String jwt = System.getenv("JWT_SECRET");
        if (jwt != null && !jwt.isBlank()) assertThat(texto).doesNotContain(jwt);
    }
}
