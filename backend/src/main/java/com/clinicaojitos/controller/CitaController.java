package com.clinicaojitos.controller;

import com.clinicaojitos.domain.dto.CitaDto;
import com.clinicaojitos.domain.service.CitaService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

/**
 * Endpoints de la agenda y las citas médicas (RF-03).
 */
@RestController
@RequestMapping("/api/v1/citas")
@RequiredArgsConstructor
@Tag(name = "Citas", description = "Programación, reprogramación y cancelación (RF-03)")
public class CitaController {

    private final CitaService citaService;

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMINISTRADOR','RECEPCIONISTA','OFTALMOLOGO','PACIENTE')")
    @Operation(summary = "Agenda en un rango de fechas")
    public List<CitaDto.Evento> agenda(
            @RequestParam(required = false) Long oftalmologoId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate desde,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate hasta) {
        return citaService.agenda(oftalmologoId, desde, hasta);
    }

    @GetMapping("/agenda")
    @PreAuthorize("hasAnyRole('ADMINISTRADOR','RECEPCIONISTA','OFTALMOLOGO')")
    @Operation(summary = "Agenda de un día, para el panel del especialista y el de recepción")
    public List<CitaDto.AgendaDia> agendaDiaria(
            @RequestParam(required = false) Long oftalmologoId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fecha) {
        return citaService.agendaDiaria(oftalmologoId, fecha);
    }

    @GetMapping("/disponibilidad")
    @PreAuthorize("hasAnyRole('ADMINISTRADOR','RECEPCIONISTA','OFTALMOLOGO','PACIENTE')")
    @Operation(summary = "Franjas libres y reservadas de un profesional en una fecha")
    public List<CitaDto.Franja> disponibilidad(
            @RequestParam Long oftalmologoId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fecha) {
        return citaService.disponibilidad(oftalmologoId, fecha);
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMINISTRADOR','RECEPCIONISTA','OFTALMOLOGO')")
    @Operation(summary = "Detalle de una cita")
    public CitaDto.Response obtener(@PathVariable Long id) {
        return citaService.obtener(id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAnyRole('ADMINISTRADOR','RECEPCIONISTA','OFTALMOLOGO')")
    @Operation(summary = "Programa una cita (rechaza cruces de horario, RF3.2)")
    public CitaDto.Response registrar(@Valid @RequestBody CitaDto.Request request) {
        return citaService.registrar(request);
    }

    @PatchMapping("/{id}/reprogramar")
    @PreAuthorize("hasAnyRole('ADMINISTRADOR','RECEPCIONISTA','OFTALMOLOGO')")
    @Operation(summary = "Reprograma una cita liberando el turno anterior")
    public CitaDto.Response reprogramar(
            @PathVariable Long id, @Valid @RequestBody CitaDto.ReprogramarRequest request) {
        return citaService.reprogramar(id, request);
    }

    @PatchMapping("/{id}/cancelar")
    @PreAuthorize("hasAnyRole('ADMINISTRADOR','RECEPCIONISTA','OFTALMOLOGO')")
    @Operation(summary = "Cancela una cita y libera el horario")
    public CitaDto.Response cancelar(
            @PathVariable Long id, @Valid @RequestBody CitaDto.CancelarRequest request) {
        return citaService.cancelar(id, request);
    }

    @PatchMapping("/{id}/estado")
    @PreAuthorize("hasAnyRole('ADMINISTRADOR','RECEPCIONISTA','OFTALMOLOGO')")
    @Operation(summary = "Cambia el estado de la cita en el flujo de atención")
    public CitaDto.Response cambiarEstado(
            @PathVariable Long id, @Valid @RequestBody CitaDto.EstadoRequest request) {
        return citaService.cambiarEstado(id, request);
    }
}
