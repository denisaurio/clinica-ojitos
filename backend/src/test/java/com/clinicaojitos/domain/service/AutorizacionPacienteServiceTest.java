package com.clinicaojitos.domain.service;

import com.clinicaojitos.domain.entity.Paciente;
import com.clinicaojitos.domain.entity.Rol;
import com.clinicaojitos.domain.entity.Usuario;
import com.clinicaojitos.domain.repository.PacienteRepository;
import com.clinicaojitos.domain.repository.UsuarioRepository;
import com.clinicaojitos.exception.AccesoDenegadoException;
import com.clinicaojitos.security.SecurityUtils;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

/**
 * Pruebas del aislamiento de datos clínicos (RNF-01).
 *
 * <p>Verifica que un paciente no pueda leer la ficha de otro. Los endpoints
 * reciben el identificador en la URL, así que cualquiera podría escribirlo a
 * mano: la comprobación tiene que vivir en el servicio, no en la pantalla.
 */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
@DisplayName("AutorizacionPacienteService — RNF-01")
class AutorizacionPacienteServiceTest {

    @Mock private UsuarioRepository usuarioRepository;
    @Mock private PacienteRepository pacienteRepository;

    @InjectMocks private AutorizacionPacienteService servicio;

    @BeforeEach
    void preparar() {
        // Usuario 1 = yo (maria), usuario 2 = otro paciente (juan).
        when(usuarioRepository.findByUsernameIgnoreCase("maria"))
                .thenReturn(Optional.of(usuario(10L, "maria", "maria@correo.pe")));
        when(usuarioRepository.findByUsernameIgnoreCase("juan"))
                .thenReturn(Optional.of(usuario(11L, "juan", "juan@correo.pe")));

        when(pacienteRepository.findByEmailParaAcceso("maria@correo.pe"))
                .thenReturn(Optional.of(paciente(100L, "Maria")));
        when(pacienteRepository.findByEmailParaAcceso("juan@correo.pe"))
                .thenReturn(Optional.of(paciente(200L, "Juan")));
    }

    @AfterEach
    void limpiar() {
        SecurityContextHolder.clearContext();
    }

    private Usuario usuario(Long id, String username, String email) {
        return Usuario.builder()
                .id(id).username(username).email(email)
                .rol(Rol.builder().id(4).codigo("PACIENTE").build())
                .activo(Boolean.TRUE).build();
    }

    private Paciente paciente(Long id, String nombre) {
        return Paciente.builder().id(id).nombres(nombre).apellidos("Prueba").build();
    }

    private void entrarComo(String username, String rol) {
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(
                        username, null,
                        List.of(new SimpleGrantedAuthority("ROLE_" + rol))));
    }

    @Test
    @DisplayName("El paciente puede consultar su propio historial")
    void pacienteAccedeASuPropiaFicha() {
        entrarComo("maria", "PACIENTE");

        assertThat(servicio.puedeVer(100L)).isTrue();
        assertThat(servicio.esSuPropiaFicha(100L)).isTrue();
    }

    @Test
    @DisplayName("El paciente NO puede consultar el historial de otro")
    void pacienteNoAccedeAFichaAjena() {
        entrarComo("maria", "PACIENTE");

        assertThat(servicio.puedeVer(200L)).isFalse();
        assertThatThrownBy(() -> servicio.exigirAcceso(200L))
                .isInstanceOf(AccesoDenegadoException.class)
                .hasMessageContaining("propia información");
    }

    @Test
    @DisplayName("El oftalmólogo y el administrador ven cualquier ficha")
    void profesionalesVenTodasLasFichas() {
        entrarComo("carlos", "OFTALMOLOGO");
        assertThat(servicio.puedeVer(100L)).isTrue();
        assertThat(servicio.puedeVer(200L)).isTrue();

        entrarComo("admin", "ADMINISTRADOR");
        assertThat(servicio.puedeVer(200L)).isTrue();
    }

    @Test
    @DisplayName("Recepción atiende la agenda pero no el historial clínico")
    void recepcionNoAccedeAlHistorial() {
        entrarComo("recepcion", "RECEPCIONISTA");

        assertThat(servicio.puedeVer(100L)).isFalse();
        assertThatThrownBy(() -> servicio.exigirAcceso(100L))
                .isInstanceOf(AccesoDenegadoException.class);
    }

    @Test
    @DisplayName("Sin sesión no hay acceso a ninguna ficha")
    void sinSesionNoHayAcceso() {
        SecurityContextHolder.clearContext();
        assertThat(servicio.puedeVer(100L)).isFalse();
    }

    @Test
    @DisplayName("Un paciente sin ficha propia lo recibe como recurso no encontrado")
    void cuentaSinFicha() {
        entrarComo("juan", "PACIENTE");
        when(pacienteRepository.findByEmailParaAcceso("juan@correo.pe"))
                .thenReturn(Optional.empty());

        assertThatThrownBy(() -> servicio.suPropiaFicha())
                .isInstanceOf(com.clinicaojitos.exception.RecursoNoEncontradoException.class)
                .hasMessageContaining("ficha de paciente");
    }
}