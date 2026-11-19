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

    @Test
    @WithMockUser(username = "paciente.ajeno", roles = "PACIENTE")
    @DisplayName("RF3.1: un PACIENTE no puede reservar una cita para otro paciente (403)")
    void pacienteNoReservaParaOtro() throws Exception {
        String manana = java.time.LocalDate.now().plusDays(1).toString();
        mvc.perform(post("/api/v1/citas")
                        .contentType("application/json")
                        .content("{\"pacienteId\":999,\"oftalmologoId\":1,\"fecha\":\"" + manana
                                + "\",\"horaInicio\":\"09:00\",\"horaFin\":\"09:30\"}"))
                .andExpect(status().isForbidden());
    }
}
