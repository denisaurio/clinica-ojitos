package com.clinicaojitos.domain.service;

import com.clinicaojitos.audit.Auditado;
import com.clinicaojitos.domain.dto.PacienteDto;
import com.clinicaojitos.domain.entity.Cita;
import com.clinicaojitos.domain.entity.Consulta;
import com.clinicaojitos.domain.entity.Examen;
import com.clinicaojitos.domain.entity.Paciente;
import com.clinicaojitos.domain.entity.TipoSeguro;
import com.clinicaojitos.domain.entity.Tratamiento;
import com.clinicaojitos.domain.repository.*;
import com.clinicaojitos.exception.DocumentoDuplicadoException;
import com.clinicaojitos.exception.RecursoNoEncontradoException;
import com.clinicaojitos.exception.OperacionInvalidaException;
import com.clinicaojitos.security.SecurityUtils;
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
    public PacienteDto.Response registrar(PacienteDto.Request request) {
        String documento = normalizar(request.documento());

        if (documento.isEmpty()) {
            throw new OperacionInvalidaException("El documento de identidad es obligatorio.");
        }
        if (pacienteRepository.existsByDocumento(documento)) {
            throw new DocumentoDuplicadoException(
                    "Este documento de identidad ya está registrado en el sistema.");
        }

        Paciente p = new Paciente();
        aplicar(p, request);
        p.setDocumento(documento);

        return mapeador.aPaciente(pacienteRepository.save(p));
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
