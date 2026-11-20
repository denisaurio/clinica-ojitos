package com.clinicaojitos;

import com.clinicaojitos.config.DiagnosticoArranque;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;

/**
 * Punto de entrada del backend de la Clínica Oftalmológica Ojitos.
 *
 * <p>Sistema web de gestión clínica oftalmológica construido con Spring Boot,
 * JPA/Hibernate y MySQL, siguiendo una arquitectura en capas.
 */
@SpringBootApplication
@EnableJpaAuditing
public class ClinicaOftalmologicaApplication {

    public static void main(String[] args) {
        SpringApplication app = new SpringApplication(ClinicaOftalmologicaApplication.class);
        // Imprime al final del log qué configuración recibió el contenedor.
        app.addListeners(new DiagnosticoArranque());
        try {
            app.run(args);
        } catch (RuntimeException | Error e) {
            // Spring ya imprimió el stacktrace: el resumen queda como última línea
            // del log, que es la parte que muestra Coolify.
            System.err.println(DiagnosticoArranque.resumen("ARRANQUE FALLIDO", null, e));
            throw e;
        }
    }
}
