package com.clinicaojitos.config;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Documentación interactiva de la API en /swagger-ui.html.
 */
@Configuration
public class OpenApiConfig {

    @Bean
    public OpenAPI clinicaOjitosOpenAPI() {
        final String esquema = "bearerAuth";

        return new OpenAPI()
                .info(new Info()
                        .title("API · Clínica Oftalmológica Ojitos")
                        .version("1.0.0")
                        .description("""
                                API REST del sistema de gestión de la Clínica Oftalmológica Ojitos.

                                Módulos: pacientes (RF-01), historial médico (RF-02), citas (RF-03),
                                tratamientos (RF-04), oftalmólogos (RF-05) y seguridad (RF-06).

                                Autenticación: POST /api/v1/auth/login y luego enviar el token
                                en la cabecera Authorization con el formato
                                "Bearer {token}".
                                """))
                .addSecurityItem(new SecurityRequirement().addList(esquema))
                .components(new Components().addSecuritySchemes(esquema,
                        new SecurityScheme()
                                .name(esquema)
                                .type(SecurityScheme.Type.HTTP)
                                .scheme("bearer")
                                .bearerFormat("JWT")));
    }
}
