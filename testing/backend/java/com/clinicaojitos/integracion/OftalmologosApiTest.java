package com.clinicaojitos.integracion;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.security.test.context.support.WithMockUser;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** Módulo OFTALMOLOGOS (RF-05) — API protegida por Spring Security + roles. */
@DisplayName("API OFTALMOLOGOS (RF-05)")
class OftalmologosApiTest extends BaseIntegracionTest {

    @Test
    @DisplayName("Sin token: 401")
    void sinToken() throws Exception {
        mvc.perform(get("/api/v1/oftalmologos")).andExpect(status().isUnauthorized());
    }

    @Test
    @WithMockUser(roles = "RECEPCIONISTA")
    @DisplayName("Solo ADMIN/OFTALMOLOGO ven las métricas de un médico: 403")
    void recepcionNoVeMetricas() throws Exception {
        mvc.perform(get("/api/v1/oftalmologos/1/metricas")).andExpect(status().isForbidden());
    }
}
