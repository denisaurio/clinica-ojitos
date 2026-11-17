package com.clinicaojitos.domain.service;

import com.clinicaojitos.domain.dto.OftalmologoDto;
import com.clinicaojitos.domain.entity.Oftalmologo;
import com.clinicaojitos.domain.entity.Sede;
import com.clinicaojitos.domain.entity.Subespecialidad;
import com.clinicaojitos.domain.repository.*;
import com.clinicaojitos.exception.ColegiaturaDuplicadaException;
import com.clinicaojitos.exception.RecursoNoEncontradoException;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

/**
 * Pruebas de la capa de servicio de oftalmólogos (RF-05).
 *
 * <p>El foco está en la regla RF5.2: el número de colegiatura es único.
 */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
@DisplayName("OftalmologoService — RF-05")
class OftalmologoServiceTest {

    @Mock private OftalmologoRepository oftalmologoRepository;
    @Mock private SubespecialidadRepository subespecialidadRepository;
    @Mock private SedeRepository sedeRepository;
    @Mock private HorarioLaboralRepository horarioRepository;
    @Mock private DiaSemanaRepository diaSemanaRepository;
    @Mock private TipoBloqueHorarioRepository tipoBloqueRepository;
    @Mock private CitaRepository citaRepository;
    @Mock private ConsultaRepository consultaRepository;
    @Mock private CirugiaRepository cirugiaRepository;
    @Mock private UsuarioOftalmologoRepository usuarioOftalmologoRepository;
    @Mock private UsuarioRepository usuarioRepository;
    @Mock private RolRepository rolRepository;
    @Mock private com.clinicaojitos.security.GeneradorDeCredenciales generador;
    @Mock private org.springframework.security.crypto.password.PasswordEncoder passwordEncoder;
    @Mock private CatalogoResolutorService catalogo;
    @Mock private Mapeador mapeador;

    @InjectMocks private OftalmologoService servicio;

    private OftalmologoDto.Request requestValido() {
        return new OftalmologoDto.Request(
                "Elena", "Rostova", "e.rostova@clinicaojitos.pe", "987654321",
                "COP-38472", 1, null, 1, null, null, null, Boolean.TRUE);
    }

    @Test
    @DisplayName("Registra un oftalmólogo nuevo")
    void registraOftalmologo() {
        when(oftalmologoRepository.existsByNumeroColegiatura("COP-38472")).thenReturn(false);
        when(subespecialidadRepository.findById(1)).thenReturn(Optional.of(
                Subespecialidad.builder().id(1).codigo("GLAUCOMA").nombre("Glaucoma").build()));
        when(sedeRepository.findById(1)).thenReturn(Optional.of(
                Sede.builder().id(1).nombre("Sede Central - Ojitos").build()));
        when(oftalmologoRepository.save(any(Oftalmologo.class))).thenAnswer(inv -> inv.getArgument(0));
        when(mapeador.aOftalmologo(any(Oftalmologo.class))).thenReturn(null);

        servicio.registrar(requestValido());

        verify(oftalmologoRepository).save(any(Oftalmologo.class));
    }

    @Test
    @DisplayName("RF5.2 — Rechaza una colegiatura ya registrada")
    void rechazaColegiaturaDuplicada() {
        when(oftalmologoRepository.existsByNumeroColegiatura("COP-38472")).thenReturn(true);

        assertThatThrownBy(() -> servicio.registrar(requestValido()))
                .isInstanceOf(ColegiaturaDuplicadaException.class)
                .hasMessageContaining("ya está registrado");

        verify(oftalmologoRepository, never()).save(any());
    }

    @Test
    @DisplayName("Verifica la colegiatura en tiempo real desde el formulario de alta")
    void verificaColegiatura() {
        when(oftalmologoRepository.existsByNumeroColegiatura("COP-38472")).thenReturn(true);

        var resultado = servicio.existeColegiatura("COP-38472");

        assertThat(resultado.existe()).isTrue();
        assertThat(resultado.mensaje()).contains("ya está registrado");

        when(oftalmologoRepository.existsByNumeroColegiatura("COP-11111")).thenReturn(false);
        assertThat(servicio.existeColegiatura("COP-11111").existe()).isFalse();
        assertThat(servicio.existeColegiatura("  ").existe()).isFalse();
    }

    @Test
    @DisplayName("Lanza 404 al consultar un profesional inexistente")
    void profesionalInexistente() {
        when(oftalmologoRepository.findById(999L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> servicio.obtener(999L))
                .isInstanceOf(RecursoNoEncontradoException.class);
    }

    @Test
    @DisplayName("RF5.5 — La desactivación conserva la ficha y su historial")
    void desactivaSinBorrar() {
        Oftalmologo o = Oftalmologo.builder()
                .id(1L).nombres("Ana").apellidos("Quispe")
                .numeroColegiatura("COP-61230")
                .activo(Boolean.TRUE)
                .build();
        when(oftalmologoRepository.findById(1L)).thenReturn(Optional.of(o));
        when(oftalmologoRepository.save(any(Oftalmologo.class))).thenAnswer(inv -> inv.getArgument(0));
        when(mapeador.aOftalmologo(any(Oftalmologo.class))).thenReturn(null);

        servicio.desactivar(1L);

        assertThat(o.getActivo()).isFalse();
        verify(oftalmologoRepository, never()).delete(any());
    }
}
