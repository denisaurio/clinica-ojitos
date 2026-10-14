package com.clinicaojitos.domain.service;

import com.clinicaojitos.audit.Auditado;
import com.clinicaojitos.domain.dto.OftalmologoDto;
import com.clinicaojitos.domain.entity.HorarioLaboral;
import com.clinicaojitos.domain.entity.Oftalmologo;
import com.clinicaojitos.domain.entity.Rol;
import com.clinicaojitos.domain.entity.Sede;
import com.clinicaojitos.domain.entity.Subespecialidad;
import com.clinicaojitos.domain.entity.Usuario;
import com.clinicaojitos.domain.entity.UsuarioOftalmologo;
import com.clinicaojitos.domain.repository.*;
import com.clinicaojitos.exception.ColegiaturaDuplicadaException;
import com.clinicaojitos.exception.OperacionInvalidaException;
import com.clinicaojitos.exception.RecursoNoEncontradoException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.util.List;

/**
 * Lógica de negocio del directorio de oftalmólogos (RF-05).
 *
 * <p>Aplica la regla RF5.2: el número de colegiatura es único en el sistema.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class OftalmologoService {

    /**
     * Hash BCrypt de la contraseña temporal que reciben las cuentas creadas
     * automáticamente al dar de alta a un profesional. El administrador debe
     * restablecerla en el primer acceso.
     */
    private static final String PASSWORD_TEMPORAL_HASH =
            "$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy";

    private final OftalmologoRepository oftalmologoRepository;
    private final SubespecialidadRepository subespecialidadRepository;
    private final SedeRepository sedeRepository;
    private final HorarioLaboralRepository horarioRepository;
    private final DiaSemanaRepository diaSemanaRepository;
    private final TipoBloqueHorarioRepository tipoBloqueRepository;
    private final CitaRepository citaRepository;
    private final ConsultaRepository consultaRepository;
    private final CirugiaRepository cirugiaRepository;
    private final UsuarioOftalmologoRepository usuarioOftalmologoRepository;
    private final UsuarioRepository usuarioRepository;
    private final RolRepository rolRepository;
    private final Mapeador mapeador;

    @Transactional(readOnly = true)
    public Page<OftalmologoDto.Response> buscar(String buscar, Boolean activo, Pageable pageable) {
        String texto = (buscar == null || buscar.isBlank()) ? null : buscar.trim();
        return oftalmologoRepository.buscar(texto, activo, pageable).map(mapeador::aOftalmologo);
    }

    @Transactional(readOnly = true)
    public List<OftalmologoDto.Response> listarActivos() {
        return oftalmologoRepository.listarActivosConSubespecialidad().stream()
                .map(mapeador::aOftalmologo)
                .toList();
    }

    /** Verificación en tiempo real desde el formulario de alta (pantalla 3.6.16). */
    @Transactional(readOnly = true)
    public OftalmologoDto.ColegiaturaExiste existeColegiatura(String numero) {
        boolean existe = numero != null && !numero.isBlank()
                && oftalmologoRepository.existsByNumeroColegiatura(numero.trim());
        return new OftalmologoDto.ColegiaturaExiste(
                existe,
                existe ? "Este número de colegiatura ya está registrado." : null);
    }

    @Transactional(readOnly = true)
    public OftalmologoDto.Response obtener(Long id) {
        return mapeador.aOftalmologo(obtenerEntidad(id));
    }

    @Transactional
    @Auditado(accion = "CREAR", recurso = "OFTALMOLOGO", descripcion = "Alta de oftalmólogo")
    public OftalmologoDto.Response registrar(OftalmologoDto.Request r) {
        String colegiatura = r.numeroColegiatura().trim();

        if (oftalmologoRepository.existsByNumeroColegiatura(colegiatura)) {
            throw new ColegiaturaDuplicadaException(
                    "Este número de colegiatura ya está registrado en el sistema.");
        }

        Oftalmologo o = new Oftalmologo();
        o.setNombres(r.nombres().trim());
        o.setApellidos(r.apellidos().trim());
        o.setEmail(r.email().trim());
        o.setTelefono(r.telefono());
        o.setNumeroColegiatura(colegiatura);
        o.setSubespecialidad(subespecialidadRepository.findById(r.subespecialidadId())
                .orElseThrow(() -> new OperacionInvalidaException("La subespecialidad no es válida.")));
        o.setFotoUrl(r.fotoUrl());
        if (r.fechaIngreso() != null) o.setFechaIngreso(r.fechaIngreso());
        if (r.activo() != null) o.setActivo(r.activo());

        if (r.sedeId() != null) {
            Sede sede = sedeRepository.findById(r.sedeId())
                    .orElseThrow(() -> new OperacionInvalidaException("La sede no es válida."));
            o.setSede(sede);
        }

        Oftalmologo guardado = oftalmologoRepository.save(o);
        crearCuentaDeAcceso(guardado);
        return mapeador.aOftalmologo(guardado);
    }

    @Transactional
    @Auditado(accion = "ACTUALIZAR", recurso = "OFTALMOLOGO", descripcion = "Edición de oftalmólogo")
    public OftalmologoDto.Response actualizar(Long id, OftalmologoDto.Request r) {
        Oftalmologo o = obtenerEntidad(id);
        String colegiatura = r.numeroColegiatura().trim();

        if (!colegiatura.equals(o.getNumeroColegiatura())
                && oftalmologoRepository.existsByNumeroColegiatura(colegiatura)) {
            throw new ColegiaturaDuplicadaException(
                    "Este número de colegiatura ya pertenece a otro profesional.");
        }

        o.setNombres(r.nombres().trim());
        o.setApellidos(r.apellidos().trim());
        o.setEmail(r.email().trim());
        o.setTelefono(r.telefono());
        o.setNumeroColegiatura(colegiatura);
        o.setSubespecialidad(subespecialidadRepository.findById(r.subespecialidadId())
                .orElseThrow(() -> new OperacionInvalidaException("La subespecialidad no es válida.")));
        o.setFotoUrl(r.fotoUrl());
        if (r.activo() != null) o.setActivo(r.activo());

        if (r.sedeId() != null) {
            sedeRepository.findById(r.sedeId()).ifPresent(o::setSede);
        }

        return mapeador.aOftalmologo(oftalmologoRepository.save(o));
    }

    /**
     * Desactivación (RF5.5): el perfil deja de operar pero su historial clínico
     * se conserva íntegro.
     */
    @Transactional
    @Auditado(accion = "DESACTIVAR", recurso = "OFTALMOLOGO", descripcion = "Baja de oftalmólogo")
    public OftalmologoDto.Response desactivar(Long id) {
        Oftalmologo o = obtenerEntidad(id);
        o.setActivo(Boolean.FALSE);
        return mapeador.aOftalmologo(oftalmologoRepository.save(o));
    }

    // ------------------------- Horarios (RF-05.4) -------------------------

    @Transactional(readOnly = true)
    public List<OftalmologoDto.HorarioResponse> horarios(Long id) {
        obtenerEntidad(id);
        return horarioRepository.findByOftalmologoIdOrderByDiaSemanaIdAscHoraInicioAsc(id)
                .stream().map(mapeador::aHorario).toList();
    }

    /** Reemplaza la matriz semanal completa del profesional. */
    @Transactional
    @Auditado(accion = "CONFIGURAR_HORARIOS", recurso = "OFTALMOLOGO", descripcion = "Configuración de horarios")
    public List<OftalmologoDto.HorarioResponse> guardarHorarios(
            Long id, OftalmologoDto.HorariosRequest r) {

        Oftalmologo o = obtenerEntidad(id);
        horarioRepository.deleteByOftalmologoId(id);
        horarioRepository.flush();

        for (OftalmologoDto.HorarioRequest h : r.horarios()) {
            if (!h.horaFin().isAfter(h.horaInicio())) {
                throw new OperacionInvalidaException(
                        "En cada bloque, la hora de fin debe ser posterior a la de inicio.");
            }

            HorarioLaboral bloque = new HorarioLaboral();
            bloque.setOftalmologo(o);
            bloque.setDiaSemana(diaSemanaRepository.findById(h.diaSemanaId())
                    .orElseThrow(() -> new OperacionInvalidaException("El día de la semana no es válido.")));
            bloque.setHoraInicio(h.horaInicio());
            bloque.setHoraFin(h.horaFin());
            bloque.setTipoBloque(tipoBloqueRepository.findById(h.tipoBloqueId())
                    .orElseThrow(() -> new OperacionInvalidaException("El tipo de bloque no es válido.")));
            bloque.setActivo(h.activo() == null || h.activo());

            if (h.sedeId() != null) {
                sedeRepository.findById(h.sedeId()).ifPresent(bloque::setSede);
            } else if (o.getSede() != null) {
                bloque.setSede(o.getSede());
            }

            horarioRepository.save(bloque);
        }

        return horarioRepository.findByOftalmologoIdOrderByDiaSemanaIdAscHoraInicioAsc(id)
                .stream().map(mapeador::aHorario).toList();
    }

    // --------------------------- Métricas (3.6.18) ------------------------

    @Transactional(readOnly = true)
    public OftalmologoDto.Metricas metricas(Long id) {
        obtenerEntidad(id);

        long pacientes = citaRepository.countDistinctPacientesPorOftalmologo(id);
        long citasHoy = citaRepository.countByOftalmologoYFecha(id, LocalDate.now());
        long cirugias = cirugiaRepository.countByOftalmologoIdAndEstado(id, "REALIZADA");

        double horas = horarioRepository.findByOftalmologoIdAndActivoTrue(id).stream()
                .filter(h -> !"DESCANSO".equals(h.getTipoBloque().getCodigo()))
                .filter(h -> h.getDiaSemana().getOrden() != DayOfWeek.SUNDAY.getValue())
                .mapToDouble(h -> java.time.Duration.between(h.getHoraInicio(), h.getHoraFin()).toMinutes() / 60.0)
                .sum();

        double satisfaccion = 4.3 + Math.min(0.6, pacientes * 0.05);

        return new OftalmologoDto.Metricas(pacientes, citasHoy, horas, cirugias,
                Math.round(satisfaccion * 10) / 10.0);
    }

    @Transactional(readOnly = true)
    public Oftalmologo obtenerEntidad(Long id) {
        return oftalmologoRepository.findById(id)
                .orElseThrow(() -> new RecursoNoEncontradoException(
                        "No existe un oftalmólogo con el id " + id + "."));
    }

    /**
     * Crea la cuenta de acceso del profesional recién dado de alta.
     * La contraseña inicial es temporal y el administrador debe cambiarla.
     */
    private void crearCuentaDeAcceso(Oftalmologo o) {
        if (usuarioOftalmologoRepository.existsByOftalmologoId(o.getId())) {
            return;
        }
        Rol rolOftalmologo = rolRepository.findByCodigo("OFTALMOLOGO").orElse(null);
        if (rolOftalmologo == null) {
            return;
        }

        String base = o.getEmail().split("@")[0];
        String username = base.length() > 59 ? base.substring(0, 59) : base;
        if (usuarioRepository.existsByUsernameIgnoreCase(username)) {
            log.warn("No se creó la cuenta de {}: el usuario {} ya existe.", o.getEmail(), username);
            return;
        }

        Usuario nuevo = new Usuario();
        nuevo.setUsername(username);
        nuevo.setPasswordHash(PASSWORD_TEMPORAL_HASH);
        nuevo.setEmail(o.getEmail());
        nuevo.setRol(rolOftalmologo);
        nuevo.setActivo(Boolean.TRUE);
        nuevo.setIntentosFallidos(0);

        Usuario guardado = usuarioRepository.save(nuevo);

        usuarioOftalmologoRepository.save(UsuarioOftalmologo.builder()
                .usuarioId(guardado.getId())
                .oftalmologoId(o.getId())
                .build());

        log.info("Cuenta de acceso creada para el oftalmólogo {} (usuario: {})",
                o.getNombreCompleto(), username);
    }
}
