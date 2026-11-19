package com.clinicaojitos.integracion;

import com.clinicaojitos.domain.entity.Rol;
import com.clinicaojitos.domain.entity.Usuario;
import com.clinicaojitos.domain.repository.RolRepository;
import com.clinicaojitos.domain.repository.UsuarioRepository;
import com.clinicaojitos.security.TokenRecuperacion;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** RF6.4 — recuperar la contraseña con el enlace enviado por correo. */
@DisplayName("API recuperación de contraseña (RF6.4)")
class RecuperacionClaveApiTest extends BaseIntegracionTest {

    @Autowired private UsuarioRepository usuarios;
    @Autowired private RolRepository roles;
    @Autowired private PasswordEncoder encoder;
    @Autowired private TokenRecuperacion tokens;

    private Usuario crear(String username) {
        Rol rol = roles.findByCodigo("RECEPCIONISTA").orElseGet(() ->
                roles.save(Rol.builder().codigo("RECEPCIONISTA").nombre("Recepcionista").build()));
        return usuarios.save(Usuario.builder().username(username).email(username + "@clinica.pe")
                .passwordHash(encoder.encode("ClaveVieja2026*")).rol(rol).build());
    }

    private static String json(String token, String clave) {
        return "{\"token\":\"" + token + "\",\"passwordNueva\":\"" + clave + "\"}";
    }

    @Test
    @DisplayName("Pedir el enlace responde igual exista o no el correo (no revela cuentas)")
    void respuestaGenerica() throws Exception {
        crear("recup.generica");
        for (String email : new String[]{"recup.generica@clinica.pe", "nadie@clinica.pe"}) {
            mvc.perform(post("/api/v1/auth/recuperar-clave").contentType("application/json")
                            .content("{\"email\":\"" + email + "\"}"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.mensaje").exists());
        }
    }

    @Test
    @DisplayName("Con el enlace se fija la clave nueva, se puede entrar y el enlace ya no sirve")
    void restablecer() throws Exception {
        Usuario u = crear("recup.flujo");
        String token = tokens.emitir(u.getId(), u.getPasswordHash());

        mvc.perform(post("/api/v1/auth/restablecer-clave").contentType("application/json")
                        .content(json(token, "ClaveNueva2026*")))
                .andExpect(status().isOk());

        mvc.perform(post("/api/v1/auth/login").contentType("application/json")
                        .content("{\"username\":\"recup.flujo\",\"password\":\"ClaveNueva2026*\"}"))
                .andExpect(status().isOk());

        mvc.perform(post("/api/v1/auth/restablecer-clave").contentType("application/json")
                        .content(json(token, "OtraClave2026*")))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("Un enlace inventado o una clave corta se rechazan con 400")
    void invalido() throws Exception {
        mvc.perform(post("/api/v1/auth/restablecer-clave").contentType("application/json")
                        .content(json("1.9999999999.firma-falsa", "ClaveNueva2026*")))
                .andExpect(status().isBadRequest());
        mvc.perform(post("/api/v1/auth/restablecer-clave").contentType("application/json")
                        .content(json("x", "corta")))
                .andExpect(status().isBadRequest());
    }
}
