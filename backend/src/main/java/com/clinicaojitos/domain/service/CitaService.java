package com.clinicaojitos.domain.service;

import com.clinicaojitos.audit.Auditado;
import com.clinicaojitos.domain.dto.CitaDto;
import com.clinicaojitos.domain.entity.*;
import com.clinicaojitos.domain.repository.*;
import com.clinicaojitos.exception.CruceDeHorarioException;
import com.clinicaojitos.exception.OperacionInvalidaException;
import com.clinicaojitos.exception.RecursoNoEncontradoException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

/**
 * Lógica de negocio de citas médicas (RF-03).
 *
 * <p>Aplica la regla RF3.2: un oftalmólogo no puede tener dos citas en el
 * mismo horario. La validación se hace en el servicio y la base de datos la
 * refuerza con el índice único {@code uq_cita_agenda}.
 */
@Service
@RequiredArgsConstructor
public class CitaService {

    private final CitaRepository citaRepository;
    private final PacienteService pacienteService;
    private final PacienteRepository pacienteRepository;
    private final OftalmologoRepository oftalmologoRepository;
    private final EstadoCitaRepository estadoCitaRepository;
    private final TipoConsultaRepository tipoConsultaRepository;
    private final SedeRepository sedeRepository;
    private final HorarioLaboralRepository horarioLaboralRepository;
    private final DiaSemanaRepository diaSemanaRepository;
    private final TipoBloqueHorarioRepository tipoBloqueRepository;
    private final Mapeador mapeador;

    @Transactional(readOnly = true)
    public List<CitaDto.Evento> agenda(Long oftalmologoId, LocalDate desde, LocalDate hasta) {
        LocalDate f = desde == null ? LocalDate.now() : desde;
        LocalDate h = hasta == null ? f.plusDays(6) : hasta;
        return citaRepository.buscarAgenda(oftalmologoId, f, h).stream()
                .map(mapeador::aEvento)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<CitaDto.AgendaDia> agendaDiaria(Long oftalmologoId, LocalDate fecha) {
        LocalDate f = fecha == null ? LocalDate.now() : fecha;
        if (oftalmologoId == null) {
            return citaRepository.citasDelDia(f).stream().map(mapeador::aAgendaDia).toList();
        }
        return citaRepository.agendaDelDia(oftalmologoId, f).stream()
                .map(mapeador::aAgendaDia).toList();
    }

    /**
     * Franjas del día para un profesional: las definidas en su matriz de
     * horarios, marcando como BOOKED las ya reservadas (pantalla 3.6.9).
     */
    @Transactional(readOnly = true)
    public List<CitaDto.Franja> disponibilidad(Long oftalmologoId, LocalDate fecha) {
        LocalDate f = fecha == null ? LocalDate.now() : fecha;
        String codigoDia = diaSemanaRepository.findAll().stream()
                .filter(d -> d.getOrden() == f.getDayOfWeek().getValue())
                .map(DiaSemana::getCodigo)
                .findFirst()
                .orElse(null);

        if (codigoDia == null || oftalmologoId == null) {
            return List.of();
        }

        DiaSemana dia = diaSemanaRepository.findByCodigo(codigoDia).orElse(null);
        if (dia == null) return List.of();

        var reservados = citaRepository.agendaDelDia(oftalmologoId, f).stream()
                .map(c -> c.getHoraInicio())
                .collect(java.util.stream.Collectors.toSet());

        return horarioLaboralRepository
                .findByOftalmologoIdAndActivoTrue(oftalmologoId).stream()
                .filter(h -> dia.getId().equals(h.getDiaSemana().getId()))
                .filter(h -> !"DESCANSO".equals(h.getTipoBloque().getCodigo()))
                .sorted(java.util.Comparator.comparing(HorarioLaboral::getHoraInicio))
                .map(h -> new CitaDto.Franja(
                        h.getHoraInicio(),
                        h.getHoraFin(),
                        reservados.contains(h.getHoraInicio()) ? "BOOKED" : "FREE",
                        h.getTipoBloque() != null ? h.getTipoBloque().getNombre() : "Consulta"))
                .toList();
    }

    @Transactional(readOnly = true)
    public CitaDto.Response obtener(Long id) {
        return mapeador.aCita(obtenerEntidad(id));
    }

    @Transactional
    @Auditado(accion = "CREAR", recurso = "CITA", descripcion = "Programación de cita")
    public CitaDto.Response registrar(CitaDto.Request r) {
        validarRango(r.horaInicio(), r.horaFin());

        if (citaRepository.contarSolapes(r.oftalmologoId(), r.fecha(), r.horaInicio(), null) > 0) {
            throw new CruceDeHorarioException(
                    "El oftalmólogo seleccionado ya tiene una cita registrada en ese horario.");
        }

        Cita c = new Cita();
        c.setPaciente(pacienteRepository.findById(r.pacienteId())
                .orElseThrow(() -> new RecursoNoEncontradoException("El paciente no existe.")));
        c.setOftalmologo(oftalmologoRepository.findById(r.oftalmologoId())
                .orElseThrow(() -> new RecursoNoEncontradoException("El oftalmólogo no existe.")));
        c.setConsultorio(r.consultorio());
        c.setFecha(r.fecha());
        c.setHoraInicio(r.horaInicio());
        c.setHoraFin(r.horaFin());
        c.setMotivo(r.motivo());
        c.setNotaInterna(r.notaInterna());
        c.setBloqueo(Boolean.TRUE);
        aplicarReferencias(c, r.sedeId(), r.tipoConsultaId());
        c.setEstadoCita(estadoPorCodigo("PROGRAMADA"));

        return mapeador.aCita(citaRepository.save(c));
    }

    /**
     * Reprogramación: libera el turno anterior y ocupa el nuevo. El turno
     * anterior queda en la agenda con estado CANCELADA y bloqueo desactivado,
     * de modo que el histórico se conserva (RF3.3).
     */
    @Transactional
    @Auditado(accion = "REPROGRAMAR", recurso = "CITA", descripcion = "Reprogramación de cita")
    public CitaDto.Response reprogramar(Long id, CitaDto.ReprogramarRequest r) {
        Cita c = obtenerEntidad(id);
        validarRango(r.horaInicio(), r.horaFin());

        if (citaRepository.contarSolapes(c.getOftalmologo().getId(), r.fecha(), r.horaInicio(), id) > 0) {
            throw new CruceDeHorarioException(
                    "El horario elegido ya está ocupado para este oftalmólogo.");
        }

        c.setFecha(r.fecha());
        c.setHoraInicio(r.horaInicio());
        c.setHoraFin(r.horaFin());
        c.setNotaInterna(r.notaInterna());
        c.setBloqueo(Boolean.TRUE);

        EstadoCita reprogramada = estadoPorCodigo("PROGRAMADA");
        if (reprogramada != null) c.setEstadoCita(reprogramada);

        return mapeador.aCita(citaRepository.save(c));
    }

    /** Cancelación: el turno se libera pero el registro se conserva (RF3.4). */
    @Transactional
    @Auditado(accion = "CANCELAR", recurso = "CITA", descripcion = "Cancelación de cita")
    public CitaDto.Response cancelar(Long id, CitaDto.CancelarRequest r) {
        Cita c = obtenerEntidad(id);
        EstadoCita cancelada = estadoPorCodigo("CANCELADA");
        if (cancelada != null) c.setEstadoCita(cancelada);
        c.setNotaInterna(r.motivo());
        c.setBloqueo(Boolean.FALSE);
        return mapeador.aCita(citaRepository.save(c));
    }

    /** Cambio de estado en el flujo de atención: confirmado, en espera, en consulta... */
    @Transactional
    @Auditado(accion = "CAMBIAR_ESTADO", recurso = "CITA", descripcion = "Cambio de estado de cita")
    public CitaDto.Response cambiarEstado(Long id, CitaDto.EstadoRequest r) {
        Cita c = obtenerEntidad(id);
        EstadoCita estado = estadoPorCodigo(r.estado().toUpperCase());

        if (estado == null) {
            throw new OperacionInvalidaException("El estado '" + r.estado() + "' no es válido.");
        }

        c.setEstadoCita(estado);
        if ("CANCELADA".equals(estado.getCodigo())) {
            c.setBloqueo(Boolean.FALSE);
        }

        return mapeador.aCita(citaRepository.save(c));
    }

    @Transactional(readOnly = true)
    public Cita obtenerEntidad(Long id) {
        return citaRepository.findById(id)
                .orElseThrow(() -> new RecursoNoEncontradoException(
                        "No existe una cita con el id " + id + "."));
    }

    private void aplicarReferencias(Cita c, Integer sedeId, Integer tipoConsultaId) {
        if (sedeId != null) {
            sedeRepository.findById(sedeId).ifPresent(c::setSede);
        }
        if (tipoConsultaId != null) {
            tipoConsultaRepository.findById(tipoConsultaId).ifPresent(c::setTipoConsulta);
        }
    }

    private EstadoCita estadoPorCodigo(String codigo) {
        return estadoCitaRepository.findByCodigo(codigo).orElse(null);
    }

    private void validarRango(LocalTime inicio, LocalTime fin) {
        if (inicio == null || fin == null) {
            throw new OperacionInvalidaException("Debe indicar la hora de inicio y de fin.");
        }
        if (!fin.isAfter(inicio)) {
            throw new OperacionInvalidaException(
                    "La hora de fin debe ser posterior a la hora de inicio.");
        }
    }
}
