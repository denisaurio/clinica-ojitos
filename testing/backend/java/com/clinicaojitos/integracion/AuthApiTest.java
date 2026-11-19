package com.clinicaojitos.integracion;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.security.test.context.support.WithMockUser;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** Módulo AUTH (RF-06) — API protegida por Spring Security + roles. */
@DisplayName("API AUTH (RF-06)")
class AuthApiTest extends BaseIntegracionTest {

    @Test
    @DisplayName("El estado de la API es público")
    void estadoPublico() throws Exception {
        mvc.perform(get("/api/v1/estado")).andExpect(status().isOk());
    }

    @Test
    @DisplayName("Login con un usuario que no existe responde 401")
    void loginInexistente() throws Exception {
        mvc.perform(post("/api/v1/auth/login")
                        .contentType("application/json")
                        .content("{\"username\":\"no.existe\",\"password\":\"xxxxxxxx\"}"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("Login con cuerpo vacío responde 400 (validación)")
    void loginVacio() throws Exception {
        mvc.perform(post("/api/v1/auth/login")
                        .contentType("application/json")
                        .content("{\"username\":\"\",\"password\":\"\"}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("El perfil exige sesión")
    void perfilSinToken() throws Exception {
        mvc.perform(get("/api/v1/auth/me")).andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("Los archivos subidos (/uploads) NO son públicos: 401 sin sesión (RNF-01)")
    void uploadsExigeSesion() throws Exception {
        mvc.perform(get("/uploads/cualquier-examen.pdf")).andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("Un User-Agent largo no rompe el login: la auditoría lo recorta (antes 500)")
    void userAgentLargoNoRompeLogin() throws Exception {
        mvc.perform(post("/api/v1/auth/login")
                        .header("User-Agent", "Mozilla/5.0 ".repeat(25))
                        .contentType("application/json")
                        .content("{\"username\":\"no.existe\",\"password\":\"xxxxxxxx\"}"))
                .andExpect(status().isUnauthorized());
    }
}
