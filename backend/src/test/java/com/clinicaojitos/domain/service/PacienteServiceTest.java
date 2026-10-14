package com.clinicaojitos.domain.service;

import com.clinicaojitos.domain.dto.PacienteDto;
import com.clinicaojitos.domain.entity.Paciente;
import com.clinicaojitos.domain.entity.TipoSeguro;
import com.clinicaojitos.domain.repository.*;
import com.clinicaojitos.exception.DocumentoDuplicadoException;
import com.clinicaojitos.exception.RecursoNoEncontradoException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
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
 * Pruebas de la capa de servicio de pacientes (RF-01).
 *
 * <p>Verifican tanto el camino feliz como la regla de negocio RF1.2,
 * que prohíbe registrar dos pacientes con el mismo documento.
 */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
@DisplayName("PacienteService — RF-01")
class PacienteServiceTest {

    @Mock private PacienteRepository pacienteRepository;
    @Mock private TipoSeguroRepository tipoSeguroRepository;
    @Mock private ConsultaRepository consultaRepository;
    @Mock private CitaRepository citaRepository;
    @Mock private TratamientoRepository tratamientoRepository;
    @Mock private ExamenRepository examenRepository;
    @Mock private Mapeador mapeador;

    @InjectMocks private PacienteService servicio;

    private PacienteDto.Request requestValido;

    @BeforeEach
    void preparar() {
        requestValido = new PacienteDto.Request(
                "Juan Carlos",
                "Pérez Gómez",
                "45678912",
                null,
                34,
                "+51 999 999 999",
                "juan@email.com",
                "Av. Los Olivos 1234",
                null,
                "Sanitas",
                "O+",
                null,
                "Sospecha de glaucoma (OD)",
                "Penicilina",
                Boolean.TRUE);
    }

    @Test
    @DisplayName("Registra un paciente nuevo y devuelve su ficha")
    void registraPacienteExitosamente() {
        when(pacienteRepository.existsByDocumento("45678912")).thenReturn(false);
        when(tipoSeguroRepository.findAll()).thenReturn(java.util.List.of(
                TipoSeguro.builder().id(1).nombre("Sanitas").build()));
        when(pacienteRepository.save(any(Paciente.class))).thenAnswer(inv -> inv.getArgument(0));
        when(mapeador.aPaciente(any(Paciente.class))).thenReturn(null);

        servicio.registrar(requestValido);

        ArgumentCaptor<Paciente> captor = ArgumentCaptor.forClass(Paciente.class);
        verify(pacienteRepository).save(captor.capture());

        Paciente guardado = captor.getValue();
        assertThat(guardado.getDocumento()).isEqualTo("45678912");
        assertThat(guardado.getNombres()).isEqualTo("Juan Carlos");
        assertThat(guardado.getTipoSeguro()).isNotNull();
        assertThat(guardado.getTipoSeguro().getNombre()).isEqualTo("Sanitas");
    }

    @Test
    @DisplayName("RF1.2 — Rechaza un documento de identidad ya registrado")
    void rechazaDocumentoDuplicado() {
        when(pacienteRepository.existsByDocumento("45678912")).thenReturn(true);

        assertThatThrownBy(() -> servicio.registrar(requestValido))
                .isInstanceOf(DocumentoDuplicadoException.class)
                .hasMessageContaining("ya está registrado");

        verify(pacienteRepository, never()).save(any());
    }

    @Test
    @DisplayName("Lanza 404 al consultar un paciente inexistente")
    void errorAlBuscarPacienteInexistente() {
        when(pacienteRepository.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> servicio.obtener(99L))
                .isInstanceOf(RecursoNoEncontradoException.class)
                .hasMessageContaining("99");
    }

    @Test
    @DisplayName("Normaliza el documento antes de validar la unicidad")
    void normalizaDocumento() {
        PacienteDto.Request conEspacios = new PacienteDto.Request(
                "Ana", "Ramos", "  70124563B  ", null, 29, null, null, null,
                null, null, null, null, null, null, null);

        when(pacienteRepository.existsByDocumento("70124563B")).thenReturn(false);
        when(pacienteRepository.save(any(Paciente.class))).thenAnswer(inv -> inv.getArgument(0));
        when(mapeador.aPaciente(any(Paciente.class))).thenReturn(null);

        servicio.registrar(conEspacios);

        verify(pacienteRepository).existsByDocumento("70124563B");
    }

    @Test
    @DisplayName("detecta un documento ya registrado para la validación en vivo del formulario")
    void verificaExistenciaDeDocumento() {
        when(pacienteRepository.existsByDocumento("45678912")).thenReturn(true);
        assertThat(servicio.documentoExiste("45678912")).isTrue();

        when(pacienteRepository.existsByDocumento("11111111")).thenReturn(false);
        assertThat(servicio.documentoExiste("11111111")).isFalse();

        assertThat(servicio.documentoExiste("   ")).isFalse();
        assertThat(servicio.documentoExiste(null)).isFalse();
    }

    @Test
    @DisplayName("La baja es lógica: desactiva sin borrar el historial")
    void bajaLogica() {
        Paciente p = Paciente.builder()
                .id(1L).nombres("Ana").apellidos("Ramos").documento("70124563B")
                .activo(Boolean.TRUE)
                .build();
        when(pacienteRepository.findById(1L)).thenReturn(Optional.of(p));
        when(pacienteRepository.save(any(Paciente.class))).thenAnswer(inv -> inv.getArgument(0));

        servicio.desactivar(1L);

        assertThat(p.getActivo()).isFalse();
        verify(pacienteRepository, never()).delete(any());
    }
}
