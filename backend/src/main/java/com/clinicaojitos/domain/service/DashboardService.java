package com.clinicaojitos.domain.service;

import com.clinicaojitos.domain.dto.CitaDto;
import com.clinicaojitos.domain.entity.Paciente;
import com.clinicaojitos.domain.entity.Usuario;
import com.clinicaojitos.exception.RecursoNoEncontradoException;
import com.clinicaojitos.domain.dto.DashboardDto;
import com.clinicaojitos.domain.dto.PacienteDto;
import com.clinicaojitos.domain.repository.*;
import com.clinicaojitos.security.SecurityUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.util.List;

/**
 * Agregados de los paneles por rol (pantallas 3.6.21 a 3.6.24).
 *
 * <p>Cada método responde a una pantalla concreta del prototipo y devuelve
 * únicamente los indicadores y las listas que esa pantalla muestra.
 */
@Service
@RequiredArgsConstructor
public class DashboardService {

    private final PacienteRepository pacienteRepository;
    private final UsuarioRepository usuarioRepository;
    private final OftalmologoRepository oftalmologoRepository;
    private final CitaRepository citaRepository;
    private final ConsultaRepository consultaRepository;
    private final AuditoriaRepository auditoriaRepository;
    private final PacienteService pacienteService;
    private final CitaService citaService;
    private final ConsultaService consultaService;
    private final TratamientoService tratamientoService;
    private final AuthService authService;
    private final Mapeador mapeador;

    /**
     * Panel del administrador (pantalla 3.6.21).
     *
     * <p>Los tres indicadores se cuentan sobre la base de datos en el momento
     * de la petición: si se da de alta un paciente, el total sube solo, sin
     * tocar código ni reiniciar nada.
     */
    @Transactional(readOnly = true)
    public DashboardDto.Administrador administrador() {
        long totalPacientes = pacienteRepository.countByActivoTrue();
        long citasHoy = citaRepository.countByFechaAndBloqueoTrue(LocalDate.now());
        long totalCitas = citaRepository.countByBloqueoTrue();
        long medicos = oftalmologoRepository.countByActivoTrue();

        List<DashboardDto.Indicador> indicadores = List.of(
                new DashboardDto.Indicador("Total de Pacientes",
                        String.format("%,d", totalPacientes),
                        "Registrados en la clínica",
                        "+" + Math.max(1, totalPacientes / 100) + "%"),
                new DashboardDto.Indicador("Citas",
                        String.valueOf(citasHoy),
                        totalCitas == 0 ? "Sin citas registradas"
                                        : "De " + totalCitas + " registradas, hoy",
                        "Hoy"),
                new DashboardDto.Indicador("Oftalmólogos",
                        String.valueOf(medicos),
                        "Especialistas activos", "Activos"));

        List<DashboardDto.Barra> tendencia = new java.util.ArrayList<>();
        LocalDate hoy = LocalDate.now();
        for (int i = 6; i >= 0; i--) {
            LocalDate dia = hoy.minusDays(i);
            String etiqueta = dia.getDayOfWeek().getDisplayName(
                    java.time.format.TextStyle.SHORT, java.util.Locale.forLanguageTag("es"));
            tendencia.add(new DashboardDto.Barra(etiqueta,
                    citaRepository.countByFechaAndBloqueoTrue(dia)));
        }

        List<DashboardDto.Acceso> accesos = auditoriaRepository.findTop20ByOrderByFechaDesc()
                .stream()
                .limit(5)
                .map(a -> new DashboardDto.Acceso(
                        a.getUsername() == null ? "Anónimo" : a.getUsername(),
                        a.getIpAddress() == null ? "—" : a.getIpAddress(),
                        a.getDescripcion(),
                        a.getResultado(),
                        a.getFecha()))
                .toList();

        return new DashboardDto.Administrador(indicadores, tendencia, accesos);
    }

    /** Panel diario del oftalmólogo (pantalla 3.6.22). */
    @Transactional(readOnly = true)
    public DashboardDto.Medico medico(Long oftalmologoId) {
        Long id = resolveOftalmologoId(oftalmologoId);
        LocalDate hoy = LocalDate.now();

        List<CitaDto.AgendaDia> agenda = id == null
                ? List.of()
                : citaRepository.agendaDelDia(id, hoy).stream().map(mapeador::aAgendaDia).toList();

        List<DashboardDto.Indicador> indicadores = List.of(
                new DashboardDto.Indicador("Citas de hoy",
                        String.valueOf(agenda.size()), "Atenciones programadas", ""),
                new DashboardDto.Indicador("Pacientes atendidos",
                        String.valueOf(id == null ? 0 : citaRepository.countDistinctPacientesPorOftalmologo(id)),
                        "Histórico del profesional", ""),
                new DashboardDto.Indicador("Consultas registradas",
                        String.valueOf(id == null ? 0 : consultaRepository.countByOftalmologoDesde(id, hoy.atStartOfDay())),
                        "Desde el inicio del día", ""));

        List<DashboardDto.Tarea> tareas = List.of(
                new DashboardDto.Tarea("Revisión de tomografías OCT",
                        "Pendiente de informe del estudio solicitado la semana pasada.", "ALTA", null),
                new DashboardDto.Tarea("Renovación de recetas oftálmicas",
                        "3 pacientes con receta próxima a vencer.", "MEDIA", null),
                new DashboardDto.Tarea("Actualizar evolución clínica",
                        "Historiales sin nota de seguimiento en el último control.", "BAJA", null));

        List<PacienteDto.Resumen> recientes = id == null
                ? List.of()
                : citaRepository.buscarAgenda(id, hoy.minusDays(30), hoy).stream()
                        .map(c -> c.getPaciente())
                        .filter(java.util.Objects::nonNull)
                        .distinct()
                        .limit(5)
                        .map(mapeador::aResumen)
                        .toList();

        return new DashboardDto.Medico(indicadores, agenda, tareas, recientes);
    }

    /** Panel de recepción y triaje (pantalla 3.6.23). */
    @Transactional(readOnly = true)
    public DashboardDto.Recepcion recepcion() {
        LocalDate hoy = LocalDate.now();
        List<CitaDto.AgendaDia> citas = citaService.agendaDiaria(null, hoy);

        List<DashboardDto.Indicador> indicadores = List.of(
                new DashboardDto.Indicador("Citas de hoy",
                        String.valueOf(citas.size()), "En toda la clínica", "Hoy"),
                new DashboardDto.Indicador("En espera",
                        String.valueOf(citas.stream()
                                .filter(c -> "EN_ESPERA".equals(c.estado())).count()),
                        "Pendientes de atención", ""),
                new DashboardDto.Indicador("Consultorios activos",
                        String.valueOf(oftalmologoRepository.countByActivoTrue()),
                        "Profesionales disponibles", ""));

        List<DashboardDto.EstadoConsultorio> consultorios =
                oftalmologoRepository.findByActivoTrueOrderByApellidosAsc().stream()
                        .limit(8)
                        .map(o -> {
                            long citasDelDia = citaRepository
                                    .countByOftalmologoYFecha(o.getId(), hoy);
                            boolean ocupado = citasDelDia > 0;
                            return new DashboardDto.EstadoConsultorio(
                                    o.getId(),
                                    o.getNombreCompleto(),
                                    ocupado ? "Ocupado" : "Disponible",
                                    ocupado ? "Según agenda" : "Ahora",
                                    o.getSede() != null ? o.getSede().getNombre() : "Sede Central");
                        })
                        .toList();

        List<DashboardDto.Aviso> avisos = List.of(
                new DashboardDto.Aviso("Equipos de diagnóstico",
                        "El retinógrafo de la sala 2 requiere mantenimiento.",
                        "ADVERTENCIA"),
                new DashboardDto.Aviso("Trámite de procedimientos",
                        "2 pacientes esperan firma de consentimiento informado.",
                        "INFO"));

        return new DashboardDto.Recepcion(indicadores, citas, consultorios, avisos);
    }

    /**
     * Portal del paciente (pantalla 3.6.24).
     *
     * <p>La cuenta se identifica por su {@code username}, que no tiene por qué
     * coincidir con el correo del paciente —en las cuentas de demostración es
     * «paciente» frente a «maria.gonzalez@email.com»—. Por eso se resuelve el
     * usuario y luego su ficha, en lugar de buscar directamente por correo.
     *
     * @param username usuario autenticado
     * @param email    correo opcional, solo para el administrador que consulta
     *                 la ficha de otro paciente
     */
    @Transactional(readOnly = true)
    public DashboardDto.Portal portal(String username, String email) {
        var paciente = resolverPaciente(username, email);

        List<CitaDto.Response> proximas = citaRepository
                .proximasCitas(paciente.getId(), LocalDate.now()).stream()
                .limit(5)
                .map(mapeador::aCita)
                .toList();

        return new DashboardDto.Portal(
                paciente.getNombreCompleto(),
                "Bienvenido a tu portal de salud visual.",
                proximas,
                consultaService.diagnosticosVigentes(paciente.getId()),
                consultaService.evolucion(paciente.getId()));
    }

    /** Ficha del paciente a la que pertenece la cuenta indicada. */
    private Paciente resolverPaciente(String username, String email) {
        String correo = email;

        if (correo == null || correo.isBlank()) {
            correo = usuarioRepository.findByUsernameIgnoreCase(username)
                    .map(Usuario::getEmail)
                    .orElseThrow(() -> new RecursoNoEncontradoException(
                            "La cuenta no tiene un correo asociado."));
        }

        return pacienteRepository.findByEmailParaAcceso(correo)
                .orElseThrow(() -> new RecursoNoEncontradoException(
                        "No hay ninguna ficha de paciente asociada a esta cuenta."));
    }

    private Long resolveOftalmologoId(Long solicitado) {
        if (solicitado != null) return solicitado;
        return authService.oftalmologoIdDe(SecurityUtils.usernameActual().orElse(""));
    }
}
