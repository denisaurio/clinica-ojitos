package com.clinicaojitos.integracion;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.security.test.context.support.WithMockUser;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** Módulo CATALOGO — API protegida por Spring Security + roles. */
@DisplayName("API CATALOGO")
class CatalogoApiTest extends BaseIntegracionTest {

    @Test
    @DisplayName("Los desplegables son públicos y responden 200")
    void catalogoPublico() throws Exception {
        mvc.perform(get("/api/v1/catalogo")).andExpect(status().isOk());
    }
}
