package com.clinicaojitos.integracion;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.security.test.context.support.WithMockUser;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** Módulo CITAS (RF-03) — API protegida por Spring Security + roles. */
@DisplayName("API CITAS (RF-03)")
class CitasApiTest extends BaseIntegracionTest {

    @Test
    @DisplayName("Sin token: 401")
    void sinToken() throws Exception {
        mvc.perform(get("/api/v1/citas/agenda")).andExpect(status().isUnauthorized());
    }

    @Test
    @WithMockUser(roles = "PACIENTE")
    @DisplayName("Un PACIENTE no ve la agenda completa: 403")
    void pacienteNoVeAgenda() throws Exception {
        mvc.perform(get("/api/v1/citas/agenda")).andExpect(status().isForbidden());
    }
}
