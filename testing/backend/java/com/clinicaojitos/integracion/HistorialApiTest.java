package com.clinicaojitos.integracion;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.security.test.context.support.WithMockUser;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** Módulo HISTORIAL (RF-02) — API protegida por Spring Security + roles. */
@DisplayName("API HISTORIAL (RF-02)")
class HistorialApiTest extends BaseIntegracionTest {

    @Test
    @DisplayName("Sin token: 401")
    void sinToken() throws Exception {
        mvc.perform(get("/api/v1/historiales/paciente/1")).andExpect(status().isUnauthorized());
    }

    @Test
    @WithMockUser(roles = "RECEPCIONISTA")
    @DisplayName("Recepción NO accede al historial clínico: 403 (RNF-01)")
    void recepcionNoLeeHistorial() throws Exception {
        mvc.perform(get("/api/v1/historiales/paciente/1")).andExpect(status().isForbidden());
    }
}
