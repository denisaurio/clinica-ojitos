package com.clinicaojitos.domain.service;

import com.clinicaojitos.audit.Auditado;
import com.clinicaojitos.domain.dto.TratamientoDto;
import com.clinicaojitos.domain.entity.*;
import com.clinicaojitos.domain.repository.*;
import com.clinicaojitos.exception.OperacionInvalidaException;
import com.clinicaojitos.exception.RecursoNoEncontradoException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * Lógica de negocio de tratamientos y procedimientos (RF-04).
 */
@Service
@RequiredArgsConstructor
public class TratamientoService {

    private final TratamientoRepository tratamientoRepository;
    private final ControlTratamientoRepository controlRepository;
    private final CirugiaRepository cirugiaRepository;
    private final PacienteRepository pacienteRepository;
    private final OftalmologoRepository oftalmologoRepository;
    private final ConsultaRepository consultaRepository;
    private final TipoTratamientoRepository tipoRepository;
    private final EstadoTratamientoRepository estadoRepository;
    private final OjoRepository ojoRepository;
    private final AuthService authService;
    private final AutorizacionPacienteService autorizacion;
    private final Mapeador mapeador;

    @Transactional(readOnly = true)
    public List<TratamientoDto.Response> listarPorPaciente(Long pacienteId) {
        autorizacion.exigirAcceso(pacienteId);
        pacienteRepository.findById(pacienteId)
                .orElseThrow(() -> new RecursoNoEncontradoException("El paciente no existe."));
        return tratamientoRepository.listarPorPaciente(pacienteId).stream()
                .map(mapeador::aTratamiento)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<TratamientoDto.Response> vigentes(Long pacienteId) {
        autorizacion.exigirAcceso(pacienteId);
        return tratamientoRepository.vigentesPorPaciente(pacienteId).stream()
                .map(mapeador::aTratamiento)
                .toList();
    }

    @Transactional(readOnly = true)
    public TratamientoDto.Response obtener(Long id) {
        return mapeador.aTratamiento(obtenerEntidad(id));
    }

    @Transactional
    @Auditado(accion = "CREAR", recurso = "TRATAMIENTO", descripcion = "Indicación de tratamiento")
    public TratamientoDto.Response registrar(TratamientoDto.Request r) {
        if (r.fechaFin() != null && r.fechaInicio() != null
                && r.fechaFin().isBefore(r.fechaInicio())) {
            throw new OperacionInvalidaException(
                    "La fecha de fin no puede ser anterior a la fecha de inicio.");
        }

        Tratamiento t = new Tratamiento();
        t.setPaciente(pacienteRepository.findById(r.pacienteId())
                .orElseThrow(() -> new RecursoNoEncontradoException("El paciente no existe.")));
        t.setOftalmologo(obtenerOftalmologo(r.oftalmologoId()));
        t.setTipo(tipoRepository.findById(r.tipoId())
                .orElseThrow(() -> new OperacionInvalidaException("El tipo de tratamiento no es válido.")));
        t.setEstado(estadoRepository.findById(r.estadoId())
                .orElseThrow(() -> new OperacionInvalidaException("El estado no es válido.")));
        t.setMedicamento(r.medicamento());
        t.setPrincipioActivo(r.principioActivo());
        t.setDosis(r.dosis());
        t.setFrecuencia(r.frecuencia());
        t.setDuracion(r.duracion());
        t.setFechaInicio(r.fechaInicio());
        t.setFechaFin(r.fechaFin());
        t.setFechaControl(r.fechaControl());
        t.setIndicaciones(r.indicaciones());
        if (r.activo() != null) t.setActivo(r.activo());

        if (r.ojoId() != null) {
            ojoRepository.findById(r.ojoId()).ifPresent(t::setOjo);
        }
        if (r.consultaId() != null) {
            consultaRepository.findById(r.consultaId()).ifPresent(t::setConsulta);
        }
        if (r.cirugiaId() != null) {
            cirugiaRepository.findById(r.cirugiaId()).ifPresent(t::setCirugia);
        }

        return mapeador.aTratamiento(tratamientoRepository.save(t));
    }

    /** Registra un control de seguimiento y actualiza la fecha del próximo. */
    @Transactional
    @Auditado(accion = "SEGUIMIENTO", recurso = "TRATAMIENTO", descripcion = "Control de tratamiento")
    public TratamientoDto.ControlResponse registrarSeguimiento(
            Long tratamientoId, TratamientoDto.SeguimientoRequest r) {

        Tratamiento t = obtenerEntidad(tratamientoId);

        ControlTratamiento c = new ControlTratamiento();
        c.setTratamiento(t);
        c.setOftalmologo(t.getOftalmologo());
        c.setFecha(r.fecha());
        c.setResultado(r.resultado());
        c.setPioOd(decimal(r.pioOd()));
        c.setPioOi(decimal(r.pioOi()));
        c.setObservaciones(r.observaciones());

        if (r.fecha() != null) {
            t.setFechaControl(r.fecha().plusMonths(1));
        }

        tratamientoRepository.save(t);
        return mapeador.aControl(controlRepository.save(c));
    }

    @Transactional(readOnly = true)
    public List<TratamientoDto.ControlResponse> controles(Long tratamientoId) {
        obtenerEntidad(tratamientoId);
        return controlRepository.findByTratamientoIdOrderByFechaDesc(tratamientoId).stream()
                .map(mapeador::aControl)
                .toList();
    }

    @Transactional
    @Auditado(accion = "CREAR", recurso = "CIRUGIA", descripcion = "Registro de procedimiento quirúrgico")
    public TratamientoDto.CirugiaResponse registrarCirugia(TratamientoDto.CirugiaRequest r) {
        Cirugia s = new Cirugia();
        s.setPaciente(pacienteRepository.findById(r.pacienteId())
                .orElseThrow(() -> new RecursoNoEncontradoException("El paciente no existe.")));
        s.setOftalmologo(obtenerOftalmologo(r.oftalmologoId()));
        s.setDiagnosticoPreop(r.diagnosticoPreop());
        s.setTipoCirugia(r.tipoCirugia());
        s.setFechaProgramada(r.fechaProgramada());
        s.setFechaRealizada(r.fechaRealizada());
        s.setAnestesia(r.anestesia());
        s.setTecnica(r.tecnica());
        s.setIncidencias(r.incidencias());
        s.setLenteIntraocular(r.lenteIntraocular());
        if (r.estado() != null && !r.estado().isBlank()) {
            s.setEstado(r.estado());
        }

        if (r.ojoId() != null) {
            ojoRepository.findById(r.ojoId()).ifPresent(s::setOjo);
        }

        return mapeador.aCirugia(cirugiaRepository.save(s));
    }

    @Transactional(readOnly = true)
    public List<TratamientoDto.CirugiaResponse> cirugiasPorPaciente(Long pacienteId) {
        autorizacion.exigirAcceso(pacienteId);
        return cirugiaRepository.findByPacienteIdOrderByFechaProgramadaDesc(pacienteId).stream()
                .map(mapeador::aCirugia)
                .toList();
    }

    @Transactional(readOnly = true)
    public Tratamiento obtenerEntidad(Long id) {
        return tratamientoRepository.findById(id)
                .orElseThrow(() -> new RecursoNoEncontradoException(
                        "No existe un tratamiento con el id " + id + "."));
    }

    private Oftalmologo obtenerOftalmologo(Long solicitado) {
        if (solicitado != null) {
            return oftalmologoRepository.findById(solicitado)
                    .orElseThrow(() -> new RecursoNoEncontradoException("El oftalmólogo no existe."));
        }
        Long propio = authService.oftalmologoIdDe(
                com.clinicaojitos.security.SecurityUtils.usernameActual().orElse(""));
        if (propio != null) {
            return oftalmologoRepository.findById(propio).orElse(null);
        }
        throw new OperacionInvalidaException("Debe indicar el oftalmólogo responsable.");
    }

    /** Convierte el número recibido en la API al DECIMAL exacto de la base. */
    private java.math.BigDecimal decimal(Double valor) {
        return valor == null ? null : java.math.BigDecimal.valueOf(valor);
    }
}