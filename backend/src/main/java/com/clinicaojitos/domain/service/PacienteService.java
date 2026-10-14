package com.clinicaojitos.domain.service;

import com.clinicaojitos.audit.Auditado;
import com.clinicaojitos.domain.dto.CredencialesDto;
import com.clinicaojitos.domain.dto.PacienteDto;
import com.clinicaojitos.domain.entity.Cita;
import com.clinicaojitos.domain.entity.Consulta;
import com.clinicaojitos.domain.entity.Examen;
import com.clinicaojitos.domain.entity.Paciente;
import com.clinicaojitos.domain.entity.Rol;
import com.clinicaojitos.domain.entity.Usuario;
import com.clinicaojitos.domain.entity.TipoSeguro;
import com.clinicaojitos.domain.entity.Tratamiento;
import com.clinicaojitos.domain.repository.*;
import com.clinicaojitos.exception.DocumentoDuplicadoException;
import com.clinicaojitos.exception.RecursoNoEncontradoException;
import com.clinicaojitos.exception.OperacionInvalidaException;
import com.clinicaojitos.security.SecurityUtils;
import org.springframework.security.crypto.password.PasswordEncoder;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

/**
 * Lógica de negocio de pacientes (RF-01).
 *
 * <p>Aplica la regla RF1.2: el documento de identidad es único en el sistema.
 * La comprobación se hace aquí y la base de datos actúa como última barrera
 * mediante el índice {@code uq_paciente_documento}.
 */
@Service
@RequiredArgsConstructor
public class PacienteService {

    private final PacienteRepository pacienteRepository;
    private final TipoSeguroRepository tipoSeguroRepository;
    private final ConsultaRepository consultaRepository;
    private final CitaRepository citaRepository;
    private final TratamientoRepository tratamientoRepository;
    private final ExamenRepository examenRepository;
    private final Mapeador mapeador;
    private final AutorizacionPacienteService autorizacion;
    private final RolRepository rolRepository;
    private final UsuarioRepository usuarioRepository;
    private final PasswordEncoder passwordEncoder;

    @Transactional(readOnly = true)
    public Page<PacienteDto.Resumen> buscar(String buscar, Pageable pageable) {
        return pacienteRepository.buscar(normalizar(buscar), pageable).map(mapeador::aResumen);
    }

    /** Verificación en tiempo real desde el formulario de alta (pantalla 3.6.2). */
    @Transactional(readOnly = true)
    public boolean documentoExiste(String documento) {
        return documento != null && !documento.isBlank()
                && pacienteRepository.existsByDocumento(documento.trim());
    }

    @Transactional(readOnly = true)
    public PacienteDto.Detalle obtenerDetalle(Long id) {
        autorizacion.exigirAcceso(id);
        Paciente p = obtenerEntidad(id);
        List<PacienteDto.Actividad> actividad = actividadReciente(id);
        return new PacienteDto.Detalle(
                mapeador.aPaciente(p),
                consultaRepository.countByPacienteId(id),
                citaRepository.countByPacienteIdAndBloqueoTrue(id),
                tratamientoRepository.countByPacienteIdAndActivoTrue(id),
                actividad);
    }

    @Transactional(readOnly = true)
    public PacienteDto.Response obtener(Long id) {
        return mapeador.aPaciente(obtenerEntidad(id));
    }

    /** Últimos exámenes y consultas del paciente, para la tarjeta de actividad. */
    @Transactional(readOnly = true)
    public List<PacienteDto.Actividad> actividadReciente(Long pacienteId) {
        autorizacion.exigirAcceso(pacienteId);
        Paciente p = obtenerEntidad(pacienteId);
        List<PacienteDto.Actividad> actividad = new ArrayList<>();

        for (Consulta c : consultaRepository.listarPorPaciente(pacienteId).stream().limit(5).toList()) {
            actividad.add(new PacienteDto.Actividad(
                    c.getId(),
                    "Consulta",
                    c.getDiagnostico(),
                    c.getOftalmologo() != null ? c.getOftalmologo().getNombreCompleto() : null,
                    c.getFecha()));
        }

        for (Examen e : examenRepository.findByPacienteIdOrderByFechaDesc(pacienteId).stream().limit(3).toList()) {
            actividad.add(new PacienteDto.Actividad(
                    e.getId(),
                    e.getTipoExamen() != null ? e.getTipoExamen().getNombre() : "Examen",
                    e.getDescripcion(),
                    null,
                    e.getFecha()));
        }

        actividad.sort(Comparator.comparing(PacienteDto.Actividad::fecha).reversed());
        return actividad;
    }

    @Transactional
    @Auditado(accion = "CREAR", recurso = "PACIENTE", descripcion = "Alta de paciente")
    public PacienteDto.AltaConCredenciales registrar(PacienteDto.Request request) {
        String documento = normalizar(request.documento());

        if (documento.isEmpty()) {
            throw new OperacionInvalidaException("El documento de identidad es obligatorio.");
        }
        if (pacienteRepository.existsByDocumento(documento)) {
            throw new DocumentoDuplicadoException(
                    "Este documento de identidad ya está registrado en el sistema.");
        }

        // La contraseña es obligatoria al dar de alta: sin ella el paciente
        // se queda sin forma de entrar a su portal.
        if (request.password() == null || request.password().isBlank()) {
            throw new OperacionInvalidaException(
                    "Debe asignar una contraseña de acceso al paciente.");
        }

        Paciente p = new Paciente();
        aplicar(p, request);
        p.setDocumento(documento);

        Paciente guardado = pacienteRepository.save(p);
        CredencialesDto credenciales = crearCuentaDeAcceso(guardado, request);

        return new PacienteDto.AltaConCredenciales(
                mapeador.aPaciente(guardado), credenciales);
    }

    /**
     * Crea la cuenta del portal del paciente con la contraseña que eligió quien
     * lo registró.
     *
     * <p>El usuario es el nombre completo tal como se escribió: admite espacios
     * («denis quispe mamani tercero» es un usuario válido). Si ya existe se le
     * añade un sufijo numérico para no rechazar el alta del paciente por un
     * choque de nombres.
     */
    private CredencialesDto crearCuentaDeAcceso(Paciente p, PacienteDto.Request request) {

        Rol rolPaciente = rolRepository.findByCodigo("PACIENTE")
                .orElseThrow(() -> new OperacionInvalidaException(
                        "Falta el rol PACIENTE en el catálogo."));

        String base = (request.username() == null || request.username().isBlank())
                ? p.getNombreCompleto()
                : request.username().trim().replaceAll("\\s+", " ");

        if (base.length() > 59) {
            base = base.substring(0, 59);
        }

        String username = base;
        int sufijo = 2;
        while (usuarioRepository.existsByUsernameIgnoreCase(username)) {
            String numero = "." + sufijo++;
            int corte = Math.min(base.length(), 59 - numero.length());
            username = base.substring(0, corte) + numero;
        }

        Usuario usuario = new Usuario();
        usuario.setUsername(username);
        usuario.setPasswordHash(passwordEncoder.encode(request.password()));
        // El correo de la ficha es la vía para reenlazar el portal si cambia.
        usuario.setEmail(p.getEmail() != null ? p.getEmail()
                : (p.getDocumento() + "@sin-correo.clinicaojitos.pe"));
        usuario.setRol(rolPaciente);
        usuario.setActivo(Boolean.TRUE);
        usuario.setIntentosFallidos(0);

        usuarioRepository.save(usuario);

        return new CredencialesDto(
                username,
                request.password(),
                p.getNombreCompleto(),
                CredencialesDto.formato(username, request.password(), p.getNombreCompleto()));
    }

    @Transactional
    @Auditado(accion = "ACTUALIZAR", recurso = "PACIENTE", descripcion = "Edición de paciente")
    public PacienteDto.Response actualizar(Long id, PacienteDto.Request request) {
        Paciente p = obtenerEntidad(id);
        String documento = normalizar(request.documento());

        if (!documento.equals(p.getDocumento())
                && pacienteRepository.existsByDocumento(documento)) {
            throw new DocumentoDuplicadoException(
                    "Este documento de identidad ya pertenece a otro paciente.");
        }

        aplicar(p, request);
        p.setDocumento(documento);

        return mapeador.aPaciente(pacienteRepository.save(p));
    }

    /**
     * Baja lógica: nunca se borra un paciente que tiene historial clínico.
     * Los datos se desactivan y se conservan para el historial.
     */
    @Transactional
    @Auditado(accion = "ELIMINAR", recurso = "PACIENTE", descripcion = "Baja de paciente")
    public void desactivar(Long id) {
        Paciente p = obtenerEntidad(id);
        p.setActivo(Boolean.FALSE);
        pacienteRepository.save(p);
    }

    @Transactional(readOnly = true)
    public Paciente obtenerEntidad(Long id) {
        return pacienteRepository.findById(id)
                .orElseThrow(() -> new RecursoNoEncontradoException(
                        "No existe un paciente con el id " + id + "."));
    }

    private void aplicar(Paciente p, PacienteDto.Request r) {
        p.setNombres(r.nombres().trim());
        p.setApellidos(r.apellidos().trim());
        p.setFechaNacimiento(r.fechaNacimiento());
        p.setEdad(r.edad() != null ? r.edad() : calcularEdad(r.fechaNacimiento()));
        p.setTelefono(r.telefono());
        p.setEmail(r.email());
        p.setDireccion(r.direccion());
        p.setGrupoSanguineo(r.grupoSanguineo());
        p.setFotoUrl(r.fotoUrl());
        p.setHistorialOcular(r.historialOcular());
        p.setAlergias(r.alergias());
        if (r.activo() != null) p.setActivo(r.activo());

        if (r.tipoSeguroId() != null) {
            TipoSeguro seguro = tipoSeguroRepository.findById(r.tipoSeguroId())
                    .orElseThrow(() -> new OperacionInvalidaException(
                            "El tipo de seguro indicado no existe."));
            p.setTipoSeguro(seguro);
        } else if (r.tipoSeguro() != null && !r.tipoSeguro().isBlank()) {
            tipoSeguroRepository.findAll().stream()
                    .filter(s -> s.getNombre().equalsIgnoreCase(r.tipoSeguro().trim()))
                    .findFirst()
                    .ifPresent(p::setTipoSeguro);
        }
    }

    private Integer calcularEdad(java.time.LocalDate fechaNacimiento) {
        if (fechaNacimiento == null) return null;
        return java.time.Period.between(fechaNacimiento, java.time.LocalDate.now()).getYears();
    }

    private String normalizar(String valor) {
        return valor == null ? "" : valor.trim();
    }
}
