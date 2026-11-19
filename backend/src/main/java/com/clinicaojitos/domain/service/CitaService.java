package com.clinicaojitos.domain.service;

import com.clinicaojitos.audit.Auditado;
import com.clinicaojitos.domain.dto.CitaDto;
import com.clinicaojitos.notificacion.NotificacionService;
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
    private final AutorizacionPacienteService autorizacion;
    private final NotificacionService notificaciones;

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

        List<Cita> ocupadas = citaRepository.agendaDelDia(oftalmologoId, f);

        // Cada bloque del horario (p. ej. 08:00-13:00) se divide en turnos de
        // DURACION_TURNO_MIN; antes se devolvía el bloque entero como una sola
        // franja y la pantalla no podía ofrecer horas concretas.
        List<CitaDto.Franja> franjas = new java.util.ArrayList<>();
        horarioLaboralRepository
                .findByOftalmologoIdAndActivoTrue(oftalmologoId).stream()
                .filter(h -> dia.getId().equals(h.getDiaSemana().getId()))
                .filter(h -> h.getTipoBloque() == null || !"DESCANSO".equals(h.getTipoBloque().getCodigo()))
                .sorted(java.util.Comparator.comparing(HorarioLaboral::getHoraInicio))
                .forEach(h -> {
                    String tipo = h.getTipoBloque() != null ? h.getTipoBloque().getNombre() : "Consulta";
                    for (LocalTime inicio = h.getHoraInicio();
                         !inicio.plusMinutes(DURACION_TURNO_MIN).isAfter(h.getHoraFin());
                         inicio = inicio.plusMinutes(DURACION_TURNO_MIN)) {
                        LocalTime fin = inicio.plusMinutes(DURACION_TURNO_MIN);
                        franjas.add(new CitaDto.Franja(inicio, fin,
                                seSolapa(ocupadas, inicio, fin) ? "BOOKED" : "FREE", tipo));
                    }
                });
        return franjas;
    }

    /** Duración de un turno ofrecido en la agenda (RF-03). */
    static final int DURACION_TURNO_MIN = 30;

    /** RF3.2 — un turno está ocupado si se cruza con alguna cita activa. */
    static boolean seSolapa(List<Cita> citas, LocalTime inicio, LocalTime fin) {
        return citas.stream().anyMatch(c ->
                c.getHoraInicio().isBefore(fin) && c.getHoraFin().isAfter(inicio));
    }

    @Transactional(readOnly = true)
    public CitaDto.Response obtener(Long id) {
        Cita c = obtenerEntidad(id);
        exigirPropiaSiEsPaciente(c);
        return mapeador.aCita(c);
    }

    /**
     * RF3.1 — el paciente gestiona solo SUS citas; el resto de roles, todas.
     * Misma regla de pertenencia que protege su historial (RNF-01).
     */
    private void exigirPropiaSiEsPaciente(Cita c) {
        if (com.clinicaojitos.security.SecurityUtils.esPaciente()) {
            autorizacion.exigirAcceso(c.getPaciente() != null ? c.getPaciente().getId() : null);
        }
    }

    private void exigirPropiaSiEsPaciente(Long pacienteId) {
        if (com.clinicaojitos.security.SecurityUtils.esPaciente()) {
            autorizacion.exigirAcceso(pacienteId);
        }
    }

    /** Una cita cancelada, atendida o con inasistencia ya no se modifica. */
    private void exigirModificable(Cita c) {
        String estado = c.getEstado();
        if ("CANCELADA".equals(estado) || "COMPLETADA".equals(estado) || "NO_ASISTIO".equals(estado)) {
            throw new OperacionInvalidaException(
                    "La cita está " + estado.toLowerCase().replace('_', ' ') + " y ya no se puede modificar.");
        }
    }

    /** No se programan ni reprograman citas en días pasados. */
    private void exigirFechaFutura(LocalDate fecha) {
        if (fecha != null && fecha.isBefore(LocalDate.now())) {
            throw new OperacionInvalidaException("No se pueden programar citas en una fecha pasada.");
        }
    }

    @Transactional
    @Auditado(accion = "CREAR", recurso = "CITA", descripcion = "Programación de cita")
    public CitaDto.Response registrar(CitaDto.Request r) {
        exigirPropiaSiEsPaciente(r.pacienteId());
        exigirFechaFutura(r.fecha());
        validarRango(r.horaInicio(), r.horaFin());

        if (citaRepository.contarSolapes(r.oftalmologoId(), r.fecha(), r.horaInicio(), r.horaFin(), null) > 0) {
            throw new CruceDeHorarioException(
                    "El oftalmólogo seleccionado ya tiene una cita registrada en ese horario.");
        }

        Cita c = new Cita();
        Paciente paciente = pacienteRepository.findById(r.pacienteId())
                .orElseThrow(() -> new RecursoNoEncontradoException("El paciente no existe."));
        Oftalmologo oftalmologo = oftalmologoRepository.findById(r.oftalmologoId())
                .orElseThrow(() -> new RecursoNoEncontradoException("El oftalmólogo no existe."));
        // Un médico desactivado o un paciente dado de baja no reciben citas nuevas.
        if (Boolean.FALSE.equals(oftalmologo.getActivo())) {
            throw new OperacionInvalidaException("El oftalmólogo está desactivado y no recibe citas nuevas.");
        }
        if (Boolean.FALSE.equals(paciente.getActivo())) {
            throw new OperacionInvalidaException("El paciente está dado de baja; reactívelo antes de agendar.");
        }
        c.setPaciente(paciente);
        c.setOftalmologo(oftalmologo);
        c.setConsultorio(r.consultorio());
        c.setFecha(r.fecha());
        c.setHoraInicio(r.horaInicio());
        c.setHoraFin(r.horaFin());
        c.setMotivo(r.motivo());
        c.setNotaInterna(r.notaInterna());
        c.setBloqueo(Boolean.TRUE);
        aplicarReferencias(c, r.sedeId(), r.tipoConsultaId());
        c.setEstadoCita(estadoPorCodigo("PROGRAMADA"));

        Cita guardada = citaRepository.save(c);
        notificaciones.citaProgramada(guardada);   // RF3.5: se envía tras el commit
        return mapeador.aCita(guardada);
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
        exigirPropiaSiEsPaciente(c);
        // Antes una cita cancelada o atendida "revivía" al reprogramarla.
        exigirModificable(c);
        exigirFechaFutura(r.fecha());
        validarRango(r.horaInicio(), r.horaFin());

        if (citaRepository.contarSolapes(c.getOftalmologo().getId(), r.fecha(), r.horaInicio(), r.horaFin(), id) > 0) {
            throw new CruceDeHorarioException(
                    "El horario elegido ya está ocupado para este oftalmólogo.");
        }

        LocalDate fechaAnterior = c.getFecha();
        LocalTime horaAnterior = c.getHoraInicio();
        c.setFecha(r.fecha());
        c.setHoraInicio(r.horaInicio());
        c.setHoraFin(r.horaFin());
        c.setNotaInterna(r.notaInterna());
        c.setBloqueo(Boolean.TRUE);

        EstadoCita reprogramada = estadoPorCodigo("PROGRAMADA");
        if (reprogramada != null) c.setEstadoCita(reprogramada);

        Cita guardada = citaRepository.save(c);
        notificaciones.citaReprogramada(guardada, fechaAnterior, horaAnterior);
        return mapeador.aCita(guardada);
    }

    /** Cancelación: el turno se libera pero el registro se conserva (RF3.4). */
    @Transactional
    @Auditado(accion = "CANCELAR", recurso = "CITA", descripcion = "Cancelación de cita")
    public CitaDto.Response cancelar(Long id, CitaDto.CancelarRequest r) {
        Cita c = obtenerEntidad(id);
        exigirPropiaSiEsPaciente(c);
        exigirModificable(c);
        EstadoCita cancelada = estadoPorCodigo("CANCELADA");
        if (cancelada != null) c.setEstadoCita(cancelada);
        c.setNotaInterna(r.motivo());
        c.setBloqueo(Boolean.FALSE);
        Cita guardada = citaRepository.save(c);
        notificaciones.citaCancelada(guardada, r.motivo());
        return mapeador.aCita(guardada);
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
