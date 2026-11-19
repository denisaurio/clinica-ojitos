package com.clinicaojitos.integracion;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

/**
 * Base de las pruebas de integración por módulo.
 *
 * <p>Levanta TODA la aplicación (controladores, seguridad, servicios, JPA)
 * contra una base H2 en memoria: no necesita MySQL. Todas las clases hijas
 * comparten el mismo contexto de Spring, así que el arranque se paga una vez.
 *
 * <p>Si esta clase falla, falla el cableado completo de la aplicación
 * (beans, entidades, seguridad): el síntoma aparece en rojo en TODOS los
 * módulos de integración.
 */
@SpringBootTest(properties = {
        "spring.datasource.url=jdbc:h2:mem:clinica_test;MODE=MySQL;DB_CLOSE_DELAY=-1",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.datasource.username=sa",
        "spring.datasource.password=",
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "spring.jpa.properties.hibernate.dialect=org.hibernate.dialect.H2Dialect",
        "app.jwt.secret=clave-de-pruebas-con-mas-de-treinta-y-dos-caracteres-0123456789",
        // RNF-01: las pruebas de integración corren con cifrado activo.
        "app.cifrado.clave=AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA="
})
@AutoConfigureMockMvc
@ActiveProfiles("test")
public abstract class BaseIntegracionTest {

    @Autowired
    protected MockMvc mvc;
}
