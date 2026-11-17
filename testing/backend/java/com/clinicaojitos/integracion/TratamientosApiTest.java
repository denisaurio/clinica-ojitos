package com.clinicaojitos.integracion;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.security.test.context.support.WithMockUser;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** Módulo TRATAMIENTOS (RF-04) — API protegida por Spring Security + roles. */
@DisplayName("API TRATAMIENTOS (RF-04)")
class TratamientosApiTest extends BaseIntegracionTest {

    @Test
    @DisplayName("Sin token: 401")
    void sinToken() throws Exception {
        mvc.perform(get("/api/v1/tratamientos/paciente/1")).andExpect(status().isUnauthorized());
    }

    @Test
    @WithMockUser(roles = "RECEPCIONISTA")
    @DisplayName("Recepción no ve los tratamientos vigentes: 403")
    void recepcionNoVeVigentes() throws Exception {
        mvc.perform(get("/api/v1/tratamientos/paciente/1/vigentes")).andExpect(status().isForbidden());
    }
}
