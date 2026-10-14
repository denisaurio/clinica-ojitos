package com.clinicaojitos.controller;

import com.clinicaojitos.domain.dto.TratamientoDto;
import com.clinicaojitos.domain.service.TratamientoService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Endpoints de tratamientos, seguimiento y cirugía (RF-04).
 */
@RestController
@RequestMapping("/api/v1/tratamientos")
@RequiredArgsConstructor
@Tag(name = "Tratamientos", description = "Prescripción y seguimiento terapéutico (RF-04)")
public class TratamientoController {

    private final TratamientoService tratamientoService;

    @GetMapping("/paciente/{pacienteId}")
    @PreAuthorize("hasAnyRole('ADMINISTRADOR','OFTALMOLOGO','RECEPCIONISTA','PACIENTE')")
    @Operation(summary = "Plan terapéutico completo del paciente")
    public List<TratamientoDto.Response> porPaciente(@PathVariable Long pacienteId) {
        return tratamientoService.listarPorPaciente(pacienteId);
    }

    @GetMapping("/paciente/{pacienteId}/vigentes")
    @PreAuthorize("hasAnyRole('ADMINISTRADOR','OFTALMOLOGO','PACIENTE')")
    @Operation(summary = "Tratamientos activos del paciente")
    public List<TratamientoDto.Response> vigentes(@PathVariable Long pacienteId) {
        return tratamientoService.vigentes(pacienteId);
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMINISTRADOR','OFTALMOLOGO')")
    @Operation(summary = "Detalle de un tratamiento")
    public TratamientoDto.Response obtener(@PathVariable Long id) {
        return tratamientoService.obtener(id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAnyRole('ADMINISTRADOR','OFTALMOLOGO')")
    @Operation(summary = "Registra una indicación terapéutica")
    public TratamientoDto.Response registrar(@Valid @RequestBody TratamientoDto.Request request) {
        return tratamientoService.registrar(request);
    }

    @PatchMapping("/{id}/seguimiento")
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAnyRole('ADMINISTRADOR','OFTALMOLOGO')")
    @Operation(summary = "Registra un control de seguimiento (RF4.5)")
    public TratamientoDto.ControlResponse seguimiento(
            @PathVariable Long id,
            @Valid @RequestBody TratamientoDto.SeguimientoRequest request) {
        return tratamientoService.registrarSeguimiento(id, request);
    }

    @GetMapping("/{id}/controles")
    @PreAuthorize("hasAnyRole('ADMINISTRADOR','OFTALMOLOGO','PACIENTE')")
    @Operation(summary = "Controles registrados de un tratamiento")
    public List<TratamientoDto.ControlResponse> controles(@PathVariable Long id) {
        return tratamientoService.controles(id);
    }

    // ------------------------ Procedimientos -----------------------------

    @GetMapping("/cirugias/paciente/{pacienteId}")
    @PreAuthorize("hasAnyRole('ADMINISTRADOR','OFTALMOLOGO','PACIENTE')")
    @Operation(summary = "Procedimientos quirúrgicos del paciente")
    public List<TratamientoDto.CirugiaResponse> cirugias(@PathVariable Long pacienteId) {
        return tratamientoService.cirugiasPorPaciente(pacienteId);
    }

    @PostMapping("/cirugias")
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAnyRole('ADMINISTRADOR','OFTALMOLOGO')")
    @Operation(summary = "Registra un procedimiento quirúrgico (RF4.4)")
    public TratamientoDto.CirugiaResponse registrarCirugia(
            @Valid @RequestBody TratamientoDto.CirugiaRequest request) {
        return tratamientoService.registrarCirugia(request);
    }
}
