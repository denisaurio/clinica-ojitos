package com.clinicaojitos.domain.service;

import com.clinicaojitos.domain.dto.TratamientoDto;
import com.clinicaojitos.domain.entity.Cirugia;
import com.clinicaojitos.domain.entity.Consulta;
import com.clinicaojitos.domain.entity.Oftalmologo;
import com.clinicaojitos.domain.entity.Paciente;
import com.clinicaojitos.domain.repository.*;
import com.clinicaojitos.exception.AccesoDenegadoException;
import com.clinicaojitos.exception.OperacionInvalidaException;
import org.junit.jupiter.api.AfterEach;
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

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

/**
 * Firma de la consulta por el médico encargado y cirugía vinculada a
 * consultas firmadas del historial.
 */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
@DisplayName("Firma de consulta y cirugía vinculada (RF-02 · RF4.4)")
class FirmaYCirugiaTest {

    // ConsultaService
    @Mock private ConsultaRepository consultaRepository;
    @Mock private PacienteRepository pacienteRepository;
    @Mock private OftalmologoRepository oftalmologoRepository;
    @Mock private TipoConsultaRepository tipoConsultaRepository;
    @Mock private SedeRepository sedeRepository;
    @Mock private TipoExamenRepository tipoExamenRepository;
    @Mock private ExamenRepository examenRepository;
    @Mock private UsuarioOftalmologoRepository usuarioOftalmologoRepository;
    @Mock private AuthService authService;
    @Mock private AutorizacionPacienteService autorizacion;
    @Mock private Mapeador mapeador;
    @InjectMocks private ConsultaService consultas;

    // TratamientoService (además de los anteriores)
    @Mock private TratamientoRepository tratamientoRepository;
    @Mock private ControlTratamientoRepository controlRepository;
    @Mock private CirugiaRepository cirugiaRepository;
    @Mock private TipoTratamientoRepository tipoRepository;
    @Mock private EstadoTratamientoRepository estadoRepository;
    @Mock private OjoRepository ojoRepository;
    @InjectMocks private TratamientoService tratamientos;

    private final Paciente paciente = Paciente.builder().id(1L).nombres("María").apellidos("G").build();
    private final Oftalmologo medico = Oftalmologo.builder().id(7L).nombres("Elena").apellidos("Rostova").build();

    private void sesion(String username, String rol) {
        SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken(
                username, null, List.of(new SimpleGrantedAuthority("ROLE_" + rol))));
    }

    @AfterEach
    void limpiar() {
        SecurityContextHolder.clearContext();
    }

    private Consulta consulta(Long id, Paciente p, boolean firmada) {
        Consulta c = Consulta.builder().id(id).paciente(p).oftalmologo(medico)
                .fecha(LocalDateTime.of(2026, 11, 10, 9, 0)).diagnostico("Catarata").build();
        if (firmada) {
            c.setFirmadaEn(LocalDateTime.of(2026, 11, 10, 9, 30));
            c.setFirmadaPor(medico);
        }
        return c;
    }

    private TratamientoDto.CirugiaRequest cirugia(List<Long> consultaIds) {
        return new TratamientoDto.CirugiaRequest(1L, 7L, "Catarata", "Facoemulsificación",
                null, null, null, null, null, null, null, "PROGRAMADA", consultaIds);
    }

    @Test
    @DisplayName("El médico encargado firma su consulta")
    void firmaElEncargado() {
        sesion("dra.rostova", "OFTALMOLOGO");
        Consulta c = consulta(5L, paciente, false);
        when(consultaRepository.findById(5L)).thenReturn(Optional.of(c));
        when(authService.oftalmologoIdDe("dra.rostova")).thenReturn(7L);
        when(consultaRepository.save(any(Consulta.class))).thenAnswer(i -> i.getArgument(0));

        consultas.firmar(5L);

        assertThat(c.getFirmadaEn()).isNotNull();
        assertThat(c.getFirmadaPor()).isEqualTo(medico);
    }

    @Test
    @DisplayName("Otro médico no puede firmar la consulta")
    void otroMedicoNoFirma() {
        sesion("dr.mendoza", "OFTALMOLOGO");
        when(consultaRepository.findById(5L)).thenReturn(Optional.of(consulta(5L, paciente, false)));
        when(authService.oftalmologoIdDe("dr.mendoza")).thenReturn(8L);

        assertThatThrownBy(() -> consultas.firmar(5L)).isInstanceOf(AccesoDenegadoException.class);
    }

    @Test
    @DisplayName("Una consulta firmada no se vuelve a firmar")
    void noSeFirmaDosVeces() {
        sesion("dra.rostova", "OFTALMOLOGO");
        when(consultaRepository.findById(5L)).thenReturn(Optional.of(consulta(5L, paciente, true)));
        when(authService.oftalmologoIdDe("dra.rostova")).thenReturn(7L);

        assertThatThrownBy(() -> consultas.firmar(5L)).isInstanceOf(OperacionInvalidaException.class);
    }

    @Test
    @DisplayName("La cirugía se vincula a una o varias consultas firmadas del paciente")
    void cirugiaConConsultasFirmadas() {
        when(pacienteRepository.findById(1L)).thenReturn(Optional.of(paciente));
        when(oftalmologoRepository.findById(7L)).thenReturn(Optional.of(medico));
        when(consultaRepository.findById(5L)).thenReturn(Optional.of(consulta(5L, paciente, true)));
        when(consultaRepository.findById(6L)).thenReturn(Optional.of(consulta(6L, paciente, true)));
        when(cirugiaRepository.save(any(Cirugia.class))).thenAnswer(i -> i.getArgument(0));
        var capturada = new Cirugia[1];
        when(mapeador.aCirugia(any(Cirugia.class))).thenAnswer(i -> {
            capturada[0] = i.getArgument(0);
            return null;
        });

        tratamientos.registrarCirugia(cirugia(List.of(5L, 6L)));

        assertThat(capturada[0].getConsultas()).extracting(Consulta::getId).containsExactlyInAnyOrder(5L, 6L);
    }

    @Test
    @DisplayName("Rechaza consultas sin firmar o de otro paciente")
    void rechazaConsultasNoValidas() {
        Paciente otro = Paciente.builder().id(2L).build();
        when(pacienteRepository.findById(1L)).thenReturn(Optional.of(paciente));
        when(oftalmologoRepository.findById(7L)).thenReturn(Optional.of(medico));
        when(consultaRepository.findById(5L)).thenReturn(Optional.of(consulta(5L, paciente, false)));
        when(consultaRepository.findById(9L)).thenReturn(Optional.of(consulta(9L, otro, true)));

        assertThatThrownBy(() -> tratamientos.registrarCirugia(cirugia(List.of(5L))))
                .isInstanceOf(OperacionInvalidaException.class)
                .hasMessageContaining("firmada");
        assertThatThrownBy(() -> tratamientos.registrarCirugia(cirugia(List.of(9L))))
                .isInstanceOf(OperacionInvalidaException.class)
                .hasMessageContaining("otro paciente");
    }
}
