package com.clinicaojitos.config;

import com.clinicaojitos.config.AdministradorInicial.Resultado;
import com.clinicaojitos.domain.entity.Rol;
import com.clinicaojitos.domain.entity.Usuario;
import com.clinicaojitos.domain.repository.RolRepository;
import com.clinicaojitos.domain.repository.UsuarioRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/** Administrador inicial desde ADMIN_USERNAME / ADMIN_PASSWORD (RF-06). */
@DisplayName("AdministradorInicial — cuenta admin desde el entorno")
class AdministradorInicialTest {

    private final UsuarioRepository usuarios = mock(UsuarioRepository.class);
    private final RolRepository roles = mock(RolRepository.class);
    private final PasswordEncoder encoder = new BCryptPasswordEncoder();

    private AdministradorInicial con(String usuario, String clave, boolean forzar) {
        return new AdministradorInicial(usuarios, roles, encoder, usuario, clave, "", forzar);
    }

    @Test
    @DisplayName("Sin variables no crea nada")
    void sinVariablesNoHaceNada() {
        assertThat(con("", "", false).asegurar()).isEqualTo(Resultado.OMITIDO);
        verify(usuarios, never()).save(any());
    }

    @Test
    @DisplayName("Rechaza claves de menos de 8 caracteres")
    void claveDebil() {
        assertThat(con("administrador", "corta", false).asegurar()).isEqualTo(Resultado.CLAVE_DEBIL);
        verify(usuarios, never()).save(any());
    }

    @Test
    @DisplayName("Crea la cuenta con rol ADMINISTRADOR y la clave en BCrypt")
    void creaCuenta() {
        Rol rol = new Rol();
        rol.setCodigo("ADMINISTRADOR");
        when(usuarios.findByUsernameIgnoreCase("administrador")).thenReturn(Optional.empty());
        when(roles.findByCodigo("ADMINISTRADOR")).thenReturn(Optional.of(rol));

        assertThat(con("administrador", "ClaveSegura123", false).asegurar()).isEqualTo(Resultado.CREADO);

        verify(usuarios).save(org.mockito.ArgumentMatchers.argThat((Usuario u) ->
                u.getRol() == rol
                        && !u.getPasswordHash().equals("ClaveSegura123")
                        && encoder.matches("ClaveSegura123", u.getPasswordHash())));
    }

    @Test
    @DisplayName("Si ya existe respeta su clave (cambiada desde Mi cuenta)")
    void respetaClaveExistente() {
        Usuario existente = Usuario.builder().username("administrador").passwordHash("hash-previo").build();
        when(usuarios.findByUsernameIgnoreCase("administrador")).thenReturn(Optional.of(existente));

        assertThat(con("administrador", "ClaveSegura123", false).asegurar()).isEqualTo(Resultado.SIN_CAMBIOS);
        assertThat(existente.getPasswordHash()).isEqualTo("hash-previo");
        verify(usuarios, never()).save(any());
    }

    @Test
    @DisplayName("ADMIN_FORZAR_CLAVE=true restablece la clave y desbloquea")
    void forzarClave() {
        Usuario existente = Usuario.builder().username("administrador").passwordHash("hash-previo")
                .activo(false).intentosFallidos(3).build();
        when(usuarios.findByUsernameIgnoreCase("administrador")).thenReturn(Optional.of(existente));

        assertThat(con("administrador", "ClaveSegura123", true).asegurar()).isEqualTo(Resultado.CLAVE_RESTABLECIDA);
        assertThat(encoder.matches("ClaveSegura123", existente.getPasswordHash())).isTrue();
        assertThat(existente.getActivo()).isTrue();
        assertThat(existente.getIntentosFallidos()).isZero();
    }
}
