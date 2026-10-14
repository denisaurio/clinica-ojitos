package com.clinicaojitos;

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
        SpringApplication.run(ClinicaOftalmologicaApplication.class, args);
    }
}
