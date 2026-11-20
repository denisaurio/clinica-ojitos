package com.clinicaojitos.domain.service;

import com.clinicaojitos.domain.dto.CitaDto;
import com.clinicaojitos.domain.entity.Cita;
import com.clinicaojitos.domain.entity.DiaSemana;
import com.clinicaojitos.domain.entity.HorarioLaboral;
import com.clinicaojitos.domain.entity.TipoBloqueHorario;
import com.clinicaojitos.domain.repository.CitaRepository;
import com.clinicaojitos.domain.repository.DiaSemanaRepository;
import com.clinicaojitos.domain.repository.HorarioLaboralRepository;
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
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

/** RF-03 — disponibilidad en turnos de 30 minutos para reservar y reprogramar. */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
@DisplayName("CitaService — disponibilidad por turnos")
class CitaDisponibilidadTest {

    @Mock private CitaRepository citaRepository;
    @Mock private DiaSemanaRepository diaSemanaRepository;
    @Mock private HorarioLaboralRepository horarioLaboralRepository;
    @Mock private com.clinicaojitos.notificacion.NotificacionService notificaciones;
    @InjectMocks private CitaService servicio;

    /** Jueves 19 de noviembre de 2026. */
    private static final LocalDate JUEVES = LocalDate.of(2026, 11, 19);

    private static Cita cita(String inicio, String fin) {
        Cita c = new Cita();
        c.setHoraInicio(LocalTime.parse(inicio));
        c.setHoraFin(LocalTime.parse(fin));
        return c;
    }

    private void horario(String inicio, String fin, String bloque) {
        DiaSemana jueves = new DiaSemana();
        jueves.setId(4);
        jueves.setCodigo("JUE");
        jueves.setOrden(4);
        TipoBloqueHorario tipo = new TipoBloqueHorario();
        tipo.setCodigo(bloque);
        tipo.setNombre(bloque);
        HorarioLaboral h = new HorarioLaboral();
        h.setDiaSemana(jueves);
        h.setHoraInicio(LocalTime.parse(inicio));
        h.setHoraFin(LocalTime.parse(fin));
        h.setTipoBloque(tipo);

        when(diaSemanaRepository.findAll()).thenReturn(List.of(jueves));
        when(diaSemanaRepository.findByCodigo("JUE")).thenReturn(Optional.of(jueves));
        when(horarioLaboralRepository.findByOftalmologoIdAndActivoTrue(anyLong())).thenReturn(List.of(h));
    }

    @Test
    @DisplayName("Divide un bloque de 08:00 a 10:00 en cuatro turnos de 30 minutos")
    void divideEnTurnos() {
        horario("08:00", "10:00", "CONSULTA");
        when(citaRepository.agendaDelDia(anyLong(), any())).thenReturn(List.of());

        List<CitaDto.Franja> franjas = servicio.disponibilidad(1L, JUEVES);

        assertThat(franjas).extracting(CitaDto.Franja::horaInicio)
                .containsExactly(LocalTime.of(8, 0), LocalTime.of(8, 30), LocalTime.of(9, 0), LocalTime.of(9, 30));
        assertThat(franjas).allMatch(f -> "FREE".equals(f.estado()));
    }

    @Test
    @DisplayName("Marca ocupados los turnos que se cruzan con una cita (aunque empiece a otra hora)")
    void marcaOcupados() {
        horario("08:00", "10:00", "CONSULTA");
        when(citaRepository.agendaDelDia(anyLong(), any())).thenReturn(List.of(cita("08:45", "09:15")));

        List<CitaDto.Franja> franjas = servicio.disponibilidad(1L, JUEVES);

        assertThat(franjas).extracting(CitaDto.Franja::estado)
                .containsExactly("FREE", "BOOKED", "BOOKED", "FREE");
    }

    @Test
    @DisplayName("Los bloques de descanso no ofrecen turnos")
    void ignoraDescanso() {
        horario("12:00", "13:00", "DESCANSO");
        when(citaRepository.agendaDelDia(anyLong(), any())).thenReturn(List.of());

        assertThat(servicio.disponibilidad(1L, JUEVES)).isEmpty();
    }

    @Test
    @DisplayName("Un turno que termina justo cuando empieza otra cita no se solapa")
    void bordesNoSeSolapan() {
        List<Cita> citas = List.of(cita("09:00", "09:30"));
        assertThat(CitaService.seSolapa(citas, LocalTime.of(8, 30), LocalTime.of(9, 0))).isFalse();
        assertThat(CitaService.seSolapa(citas, LocalTime.of(9, 30), LocalTime.of(10, 0))).isFalse();
        assertThat(CitaService.seSolapa(citas, LocalTime.of(9, 15), LocalTime.of(9, 45))).isTrue();
    }
}
