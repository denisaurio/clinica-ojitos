package com.clinicaojitos.domain.service;

import com.clinicaojitos.domain.dto.CitaDto;
import com.clinicaojitos.domain.entity.*;
import com.clinicaojitos.domain.repository.*;
import com.clinicaojitos.exception.CruceDeHorarioException;
import com.clinicaojitos.exception.OperacionInvalidaException;
import com.clinicaojitos.exception.RecursoNoEncontradoException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

/**
 * Pruebas de la capa de servicio de citas (RF-03).
 *
 * <p>El foco está en la regla RF3.2: dos citas del mismo oftalmólogo no
 * pueden ocupar el mismo horario.
 */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
@DisplayName("CitaService — RF-03")
class CitaServiceTest {

    @Mock private CitaRepository citaRepository;
    @Mock private PacienteService pacienteService;
    @Mock private PacienteRepository pacienteRepository;
    @Mock private OftalmologoRepository oftalmologoRepository;
    @Mock private EstadoCitaRepository estadoCitaRepository;
    @Mock private TipoConsultaRepository tipoConsultaRepository;
    @Mock private SedeRepository sedeRepository;
    @Mock private HorarioLaboralRepository horarioLaboralRepository;
    @Mock private DiaSemanaRepository diaSemanaRepository;
    @Mock private TipoBloqueHorarioRepository tipoBloqueRepository;
    @Mock private Mapeador mapeador;

    @InjectMocks private CitaService servicio;

    private LocalDate hoy;
    private Paciente paciente;
    private Oftalmologo oftalmologo;

    @BeforeEach
    void preparar() {
        hoy = LocalDate.now();

        paciente = Paciente.builder().id(1L).nombres("María").apellidos("González")
                .documento("45678912C").activo(Boolean.TRUE).build();

        oftalmologo = Oftalmologo.builder()
                .id(1L).nombres("Elena").apellidos("Rostova")
                .numeroColegiatura("COP-38472")
                .subespecialidad(Subespecialidad.builder().id(1).codigo("GLAUCOMA").nombre("Glaucoma").build())
                .activo(Boolean.TRUE)
                .build();

        when(pacienteRepository.findById(1L)).thenReturn(Optional.of(paciente));
        when(oftalmologoRepository.findById(1L)).thenReturn(Optional.of(oftalmologo));
        when(estadoCitaRepository.findByCodigo(anyString()))
                .thenReturn(Optional.of(EstadoCita.builder()
                        .id(1).codigo("PROGRAMADA").nombre("Programada").build()));
        when(citaRepository.save(any(Cita.class))).thenAnswer(inv -> {
            Cita c = inv.getArgument(0);
            c.setId(100L);
            return c;
        });
        when(mapeador.aCita(any(Cita.class))).thenReturn(null);
    }

    private CitaDto.Request request(LocalTime inicio, LocalTime fin) {
        return new CitaDto.Request(
                1L, 1L, 1, "C-01", hoy, inicio, fin, null, "Control de glaucoma", null);
    }

    @Test
    @DisplayName("Registra una cita como PROGRAMADA")
    void registraCita() {
        when(citaRepository.contarSolapes(anyLong(), any(), any(), any())).thenReturn(0L);

        servicio.registrar(request(LocalTime.of(9, 0), LocalTime.of(9, 30)));

        verify(citaRepository).save(any(Cita.class));
    }

    @Test
    @DisplayName("RF3.2 — Rechaza una cita en un horario ya ocupado")
    void rechazaCruceDeHorario() {
        when(citaRepository.contarSolapes(anyLong(), any(), any(), any())).thenReturn(1L);

        assertThatThrownBy(() -> servicio.registrar(request(LocalTime.of(9, 0), LocalTime.of(9, 30))))
                .isInstanceOf(CruceDeHorarioException.class)
                .hasMessageContaining("ya tiene una cita");

        verify(citaRepository, never()).save(any());
    }

    @Test
    @DisplayName("Rechaza una cita cuya hora de fin no es posterior al inicio")
    void rechazaRangoInvalido() {
        assertThatThrownBy(() -> servicio.registrar(request(LocalTime.of(10, 0), LocalTime.of(9, 0))))
                .isInstanceOf(OperacionInvalidaException.class)
                .hasMessageContaining("posterior");
    }

    @Test
    @DisplayName("RF3.4 — La cancelación libera el turno y conserva el registro")
    void cancelaCita() {
        Cita cita = new Cita();
        cita.setId(1L);
        cita.setBloqueo(Boolean.TRUE);
        cita.setOftalmologo(oftalmologo);
        cita.setEstadoCita(EstadoCita.builder().id(1).codigo("PROGRAMADA").build());

        when(citaRepository.findById(1L)).thenReturn(Optional.of(cita));
        when(estadoCitaRepository.findByCodigo("CANCELADA"))
                .thenReturn(Optional.of(EstadoCita.builder().id(2).codigo("CANCELADA").build()));
        when(mapeador.aCita(any(Cita.class))).thenReturn(null);

        servicio.cancelar(1L, new CitaDto.CancelarRequest("El paciente no puede asistir"));

        assertThat(cita.getBloqueo()).isFalse();
        assertThat(cita.getEstadoCita().getCodigo()).isEqualTo("CANCELADA");
    }

    @Test
    @DisplayName("RF3.3 — La reprogramación mueve la cita y libera el turno anterior")
    void reprogramaCita() {
        Cita cita = new Cita();
        cita.setId(1L);
        cita.setBloqueo(Boolean.TRUE);
        cita.setOftalmologo(oftalmologo);
        cita.setFecha(hoy);
        cita.setHoraInicio(LocalTime.of(9, 0));
        cita.setEstadoCita(EstadoCita.builder().id(1).codigo("PROGRAMADA").build());

        when(citaRepository.findById(1L)).thenReturn(Optional.of(cita));
        when(citaRepository.contarSolapes(eq(1L), any(), any(), eq(1L))).thenReturn(0L);
        when(mapeador.aCita(any(Cita.class))).thenReturn(null);

        LocalDate manana = hoy.plusDays(1);
        servicio.reprogramar(1L, new CitaDto.ReprogramarRequest(
                manana, LocalTime.of(11, 0), LocalTime.of(11, 30), "Cambio de turno"));

        assertThat(cita.getFecha()).isEqualTo(manana);
        assertThat(cita.getHoraInicio()).isEqualTo(LocalTime.of(11, 0));
        assertThat(cita.getNotaInterna()).isEqualTo("Cambio de turno");
    }

    @Test
    @DisplayName("RF3.3 — La reprogramación también rechaza un cruce en el nuevo horario")
    void reprogramaRechazaCruce() {
        Cita cita = new Cita();
        cita.setId(1L);
        cita.setOftalmologo(oftalmologo);
        cita.setFecha(hoy);

        when(citaRepository.findById(1L)).thenReturn(Optional.of(cita));
        when(citaRepository.contarSolapes(eq(1L), any(), any(), eq(1L))).thenReturn(1L);

        assertThatThrownBy(() -> servicio.reprogramar(1L, new CitaDto.ReprogramarRequest(
                hoy.plusDays(1), LocalTime.of(11, 0), LocalTime.of(11, 30), null)))
                .isInstanceOf(CruceDeHorarioException.class);
    }

    @Test
    @DisplayName("Lanza 404 al consultar una cita inexistente")
    void citaInexistente() {
        when(citaRepository.findById(999L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> servicio.obtener(999L))
                .isInstanceOf(RecursoNoEncontradoException.class);
    }

    @Test
    @DisplayName("Cambiar el estado a CANCELADA libera automáticamente el horario")
    void cambiarEstadoLiberaHorario() {
        Cita cita = new Cita();
        cita.setId(1L);
        cita.setBloqueo(Boolean.TRUE);
        cita.setOftalmologo(oftalmologo);

        when(citaRepository.findById(1L)).thenReturn(Optional.of(cita));
        when(estadoCitaRepository.findByCodigo("CANCELADA"))
                .thenReturn(Optional.of(EstadoCita.builder().id(2).codigo("CANCELADA").build()));
        when(mapeador.aCita(any(Cita.class))).thenReturn(null);

        servicio.cambiarEstado(1L, new CitaDto.EstadoRequest("CANCELADA"));

        assertThat(cita.getBloqueo()).isFalse();
    }
}
