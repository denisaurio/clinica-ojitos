package com.clinicaojitos.controller;

import com.clinicaojitos.domain.dto.DashboardDto;
import com.clinicaojitos.domain.entity.Auditoria;
import com.clinicaojitos.domain.repository.AuditoriaRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

/**
 * Registro de auditoría y verificación del servicio (RNF-01).
 */
@RestController
@RequestMapping("/api/v1/admin")
@RequiredArgsConstructor
@Tag(name = "Administración", description = "Auditoría y estado del sistema (RNF-01)")
public class AdminController {

    private final AuditoriaRepository auditoriaRepository;

    @GetMapping("/auditoria")
    @PreAuthorize("hasRole('ADMINISTRADOR')")
    @Operation(summary = "Bitácora de accesos y operaciones sensibles")
    public List<Map<String, Object>> auditoria(
            @RequestParam(required = false) Long usuarioId,
            @RequestParam(required = false) String accion,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate desde,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate hasta,
            @RequestParam(defaultValue = "50") int limite) {

        return auditoriaRepository.buscar(
                usuarioId,
                accion,
                desde == null ? null : desde.atStartOfDay(),
                hasta == null ? null : hasta.atTime(23, 59, 59),
                PageRequest.of(0, Math.min(Math.max(limite, 1), 200)))
                .stream()
                .map(this::aMapa)
                .toList();
    }

    @GetMapping("/auditoria/historial/{pacienteId}")
    @PreAuthorize("hasRole('ADMINISTRADOR')")
    @Operation(summary = "Trazabilidad de accesos al historial de un paciente")
    public List<Map<String, Object>> auditoriaHistorial(@PathVariable Long pacienteId) {
        return auditoriaRepository.accesosAlHistorial(pacienteId).stream()
                .map(this::aMapa)
                .toList();
    }

    private Map<String, Object> aMapa(Auditoria a) {
        return Map.of(
                "id", a.getId(),
                "fecha", a.getFecha(),
                "usuario", a.getUsername() == null ? "Anónimo" : a.getUsername(),
                "accion", a.getAccion(),
                "recurso", a.getRecurso() == null ? "" : a.getRecurso(),
                "descripcion", a.getDescripcion() == null ? "" : a.getDescripcion(),
                "ip", a.getIpAddress() == null ? "—" : a.getIpAddress(),
                "navegador", a.getNavegador() == null ? "" : a.getNavegador(),
                "resultado", a.getResultado());
    }
}
