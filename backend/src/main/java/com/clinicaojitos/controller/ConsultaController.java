package com.clinicaojitos.controller;

import com.clinicaojitos.domain.dto.ConsultaDto;
import com.clinicaojitos.domain.service.ConsultaService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Endpoints del historial médico oftalmológico (RF-02).
 */
@RestController
@RequestMapping("/api/v1/historiales")
@RequiredArgsConstructor
@Tag(name = "Historial médico", description = "Consultas oftalmológicas y evolución (RF-02)")
public class ConsultaController {

    private final ConsultaService consultaService;

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMINISTRADOR','OFTALMOLOGO')")
    @Operation(summary = "Historial paginado de un paciente")
    public Page<ConsultaDto.Response> listar(
            @RequestParam Long pacienteId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        return consultaService.listarPaginado(pacienteId,
                PageRequest.of(Math.max(0, page), Math.min(Math.max(size, 1), 100)));
    }

    @GetMapping("/paciente/{pacienteId}")
    @PreAuthorize("hasAnyRole('ADMINISTRADOR','OFTALMOLOGO','PACIENTE')")
    @Operation(summary = "Evolución cronológica completa del paciente")
    public List<ConsultaDto.Response> porPaciente(@PathVariable Long pacienteId) {
        return consultaService.listarPorPaciente(pacienteId);
    }

    @GetMapping("/paciente/{pacienteId}/evolucion")
    @PreAuthorize("hasAnyRole('ADMINISTRADOR','OFTALMOLOGO','PACIENTE')")
    @Operation(summary = "Serie temporal de presión intraocular para la gráfica de evolución")
    public List<ConsultaDto.Evolución> evolucion(@PathVariable Long pacienteId) {
        return consultaService.evolucion(pacienteId);
    }

    @GetMapping("/paciente/{pacienteId}/diagnosticos")
    @PreAuthorize("hasAnyRole('ADMINISTRADOR','OFTALMOLOGO','PACIENTE')")
    @Operation(summary = "Diagnósticos oculares vigentes del paciente")
    public List<ConsultaDto.DiagnosticoVigente> diagnosticos(@PathVariable Long pacienteId) {
        return consultaService.diagnosticosVigentes(pacienteId);
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMINISTRADOR','OFTALMOLOGO')")
    @Operation(summary = "Detalle de una consulta")
    public ConsultaDto.Response obtener(@PathVariable Long id) {
        return consultaService.obtener(id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAnyRole('ADMINISTRADOR','OFTALMOLOGO')")
    @Operation(summary = "Registra una consulta oftalmológica")
    public ConsultaDto.Response registrar(@Valid @RequestBody ConsultaDto.Request request) {
        return consultaService.registrar(request);
    }

    @PostMapping("/{id}/examenes")
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAnyRole('ADMINISTRADOR','OFTALMOLOGO')")
    @Operation(summary = "Adjunta un estudio diagnóstico a la consulta (RF2.4)")
    public ConsultaDto.ExamenResponse registrarExamen(
            @PathVariable Long id, @Valid @RequestBody ConsultaDto.ExamenRequest request) {
        return consultaService.registrarExamen(id, request);
    }

    @GetMapping("/{id}/examenes")
    @PreAuthorize("hasAnyRole('ADMINISTRADOR','OFTALMOLOGO','PACIENTE')")
    @Operation(summary = "Estudios diagnósticos adjuntos a la consulta")
    public List<ConsultaDto.ExamenResponse> examenes(@PathVariable Long id) {
        return consultaService.examenes(id);
    }
}
