package com.clinicaojitos.domain.service;

import com.clinicaojitos.audit.Auditado;
import com.clinicaojitos.domain.dto.ConsultaDto;
import com.clinicaojitos.domain.entity.Consulta;
import com.clinicaojitos.domain.entity.Examen;
import com.clinicaojitos.domain.repository.*;
import com.clinicaojitos.exception.OperacionInvalidaException;
import com.clinicaojitos.exception.RecursoNoEncontradoException;
import com.clinicaojitos.security.SecurityUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Lógica de negocio del historial médico oftalmológico (RF-02).
 */
@Service
@RequiredArgsConstructor
public class ConsultaService {

    private final ConsultaRepository consultaRepository;
    private final PacienteRepository pacienteRepository;
    private final OftalmologoRepository oftalmologoRepository;
    private final TipoConsultaRepository tipoConsultaRepository;
    private final SedeRepository sedeRepository;
    private final TipoExamenRepository tipoExamenRepository;
    private final ExamenRepository examenRepository;
    private final UsuarioOftalmologoRepository usuarioOftalmologoRepository;
    private final AuthService authService;
    private final AutorizacionPacienteService autorizacion;
    private final Mapeador mapeador;

    @Transactional(readOnly = true)
    public List<ConsultaDto.Response> listarPorPaciente(Long pacienteId) {
        // La pertenencia se comprueba aquí, no en la pantalla: cualquiera puede
        // escribir /historiales/paciente/{otroId} a mano (RNF-01).
        autorizacion.exigirAcceso(pacienteId);
        pacienteRepository.findById(pacienteId)
                .orElseThrow(() -> new RecursoNoEncontradoException("El paciente no existe."));
        return consultaRepository.listarPorPaciente(pacienteId).stream()
                .map(mapeador::aConsulta)
                .toList();
    }

    @Transactional(readOnly = true)
    public Page<ConsultaDto.Response> listarPaginado(Long pacienteId, Pageable pageable) {
        autorizacion.exigirAcceso(pacienteId);
        return consultaRepository.listarPorPacientePaginado(pacienteId, pageable)
                .map(mapeador::aConsulta);
    }

    @Transactional(readOnly = true)
    public ConsultaDto.Response obtener(Long id) {
        return mapeador.aConsulta(obtenerEntidad(id));
    }

    /**
     * Serie temporal de presión intraocular para la gráfica de evolución
     * (pantalla 3.6.4). Contiene únicamente signos vitales, ningún dato
     * identificatorio del paciente.
     */
    @Transactional(readOnly = true)
    public List<ConsultaDto.Evolución> evolucion(Long pacienteId) {
        autorizacion.exigirAcceso(pacienteId);
        pacienteRepository.findById(pacienteId)
                .orElseThrow(() -> new RecursoNoEncontradoException("El paciente no existe."));
        return consultaRepository.evolucionPio(pacienteId).stream()
                .map(mapeador::aEvolucion)
                .toList();
    }

    /** Diagnósticos vigentes del paciente, deduplicados y ordenados por fecha. */
    @Transactional(readOnly = true)
    public List<ConsultaDto.DiagnosticoVigente> diagnosticosVigentes(Long pacienteId) {
        autorizacion.exigirAcceso(pacienteId);
        Map<String, ConsultaDto.DiagnosticoVigente> porDiagnostico = new LinkedHashMap<>();

        for (Consulta c : consultaRepository.diagnosticosPorPaciente(pacienteId)) {
            String clave = c.getDiagnostico() == null ? "" : c.getDiagnostico().trim();
            if (clave.isEmpty() || porDiagnostico.containsKey(clave)) continue;

            porDiagnostico.put(clave, new ConsultaDto.DiagnosticoVigente(
                    c.getDiagnostico(),
                    c.getFecha(),
                    null,
                    null));
        }

        return List.copyOf(porDiagnostico.values());
    }

    @Transactional
    @Auditado(accion = "CREAR", recurso = "CONSULTA", descripcion = "Registro de consulta oftalmológica")
    public ConsultaDto.Response registrar(ConsultaDto.Request r) {
        Consulta c = new Consulta();

        c.setPaciente(pacienteRepository.findById(r.pacienteId())
                .orElseThrow(() -> new RecursoNoEncontradoException("El paciente no existe.")));
        c.setOftalmologo(resolverOftalmologo(r.oftalmologoId()));
        c.setFecha(r.fecha() == null ? LocalDateTime.now() : r.fecha());
        c.setTipoConsulta(tipoConsultaRepository.findById(r.tipoConsultaId())
                .orElseThrow(() -> new OperacionInvalidaException("El tipo de consulta no es válido.")));
        c.setAgudezaOd(r.agudezaOd());
        c.setAgudezaOi(r.agudezaOi());
        c.setPioOd(decimal(r.pioOd()));
        c.setPioOi(decimal(r.pioOi()));
        c.setPupilas(r.pupilas());
        c.setBiomicroscopia(r.biomicroscopia());
        c.setFondoOjo(r.fondoOjo());
        c.setDiagnostico(r.diagnostico().trim());
        c.setCie10(r.cie10());
        c.setSoapSubjetivo(r.soapSubjetivo());
        c.setSoapObjetivo(r.soapObjetivo());
        c.setSoapEvaluacion(r.soapEvaluacion());
        c.setSoapPlan(r.soapPlan());
        c.setObservaciones(r.observaciones());

        if (r.sedeId() != null) {
            sedeRepository.findById(r.sedeId()).ifPresent(c::setSede);
        }

        return mapeador.aConsulta(consultaRepository.save(c));
    }

    @Transactional
    @Auditado(accion = "AGREGAR_EXAMEN", recurso = "CONSULTA", descripcion = "Adjuntar estudio diagnóstico")
    public ConsultaDto.ExamenResponse registrarExamen(Long consultaId, ConsultaDto.ExamenRequest r) {
        Consulta c = obtenerEntidad(consultaId);

        Examen e = new Examen();
        e.setConsulta(c);
        e.setPaciente(c.getPaciente());
        e.setTipoExamen(tipoExamenRepository.findById(r.tipoExamenId())
                .orElseThrow(() -> new OperacionInvalidaException("El tipo de examen no es válido.")));
        e.setArchivoUrl(r.archivoUrl());
        e.setNombreArchivo(r.nombreArchivo());
        e.setMimeType(r.mimeType());
        e.setDescripcion(r.descripcion());

        return mapeador.aExamen(examenRepository.save(e));
    }

    @Transactional(readOnly = true)
    public List<ConsultaDto.ExamenResponse> examenes(Long consultaId) {
        return examenRepository.findByConsultaIdOrderByFechaDesc(consultaId).stream()
                .map(mapeador::aExamen)
                .toList();
    }

    @Transactional(readOnly = true)
    public Consulta obtenerEntidad(Long id) {
        return consultaRepository.findById(id)
                .orElseThrow(() -> new RecursoNoEncontradoException(
                        "No existe una consulta con el id " + id + "."));
    }

    /**
     * Si el usuario es un oftalmólogo, la consulta se le atribuye a su propia
     * ficha. Así el historial no depende de que el cliente envíe el id correcto.
     */
    private com.clinicaojitos.domain.entity.Oftalmologo resolverOftalmologo(Long solicitado) {
        if (SecurityUtils.esOftalmologo()) {
            Long propio = authService.oftalmologoIdDe(SecurityUtils.usernameActual().orElse(""));
            if (propio != null) {
                return oftalmologoRepository.findById(propio).orElse(null);
            }
        }
        if (solicitado == null) {
            throw new OperacionInvalidaException("Debe indicar el oftalmólogo responsable.");
        }
        return oftalmologoRepository.findById(solicitado)
                .orElseThrow(() -> new RecursoNoEncontradoException("El oftalmólogo no existe."));
    }

    /** Convierte el número recibido en la API al DECIMAL exacto de la base. */
    private java.math.BigDecimal decimal(Double valor) {
        return valor == null ? null : java.math.BigDecimal.valueOf(valor);
    }
}