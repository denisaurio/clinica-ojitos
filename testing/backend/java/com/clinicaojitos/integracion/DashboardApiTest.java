package com.clinicaojitos.integracion;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.security.test.context.support.WithMockUser;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** Módulo DASHBOARD y AUDITORIA — API protegida por Spring Security + roles. */
@DisplayName("API DASHBOARD y AUDITORIA")
class DashboardApiTest extends BaseIntegracionTest {

    @Test
    @DisplayName("Sin token: 401")
    void sinToken() throws Exception {
        mvc.perform(get("/api/v1/dashboards/admin")).andExpect(status().isUnauthorized());
    }

    @Test
    @WithMockUser(roles = "RECEPCIONISTA")
    @DisplayName("Recepción no ve el panel del administrador: 403")
    void recepcionNoVePanelAdmin() throws Exception {
        mvc.perform(get("/api/v1/dashboards/admin")).andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(roles = "PACIENTE")
    @DisplayName("Un PACIENTE no lee la auditoría: 403 (RNF-01)")
    void pacienteNoLeeAuditoria() throws Exception {
        mvc.perform(get("/api/v1/admin/auditoria")).andExpect(status().isForbidden());
    }
}
