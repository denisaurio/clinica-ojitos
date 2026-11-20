package com.clinicaojitos.integracion;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.security.test.context.support.WithMockUser;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** Módulo PACIENTES (RF-01) — API protegida por Spring Security + roles. */
@DisplayName("API PACIENTES (RF-01)")
class PacientesApiTest extends BaseIntegracionTest {

    @Test
    @DisplayName("Sin token: 401")
    void sinToken() throws Exception {
        mvc.perform(get("/api/v1/pacientes")).andExpect(status().isUnauthorized());
    }

    @Test
    @WithMockUser(roles = "PACIENTE")
    @DisplayName("Un PACIENTE no puede listar pacientes: 403")
    void pacienteNoLista() throws Exception {
        mvc.perform(get("/api/v1/pacientes")).andExpect(status().isForbidden());
    }

    @Test
    @org.springframework.security.test.context.support.WithMockUser(roles = "OFTALMOLOGO")
    @DisplayName("Solo administración y recepción cambian la contraseña de un paciente (403)")
    void medicoNoCambiaClaveDePaciente() throws Exception {
        mvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders
                        .post("/api/v1/pacientes/1/credenciales")
                        .contentType("application/json").content("{}"))
                .andExpect(status().isForbidden());
    }
}
