package com.clinicaojitos.controller;

import com.clinicaojitos.domain.dto.DashboardDto;
import com.clinicaojitos.domain.service.DashboardService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

/**
 * Paneles por rol (pantallas 3.6.21 a 3.6.24 del prototipo).
 */
@RestController
@RequestMapping("/api/v1/dashboards")
@RequiredArgsConstructor
@Tag(name = "Paneles", description = "Dashboards por rol")
public class DashboardController {

    private final DashboardService dashboardService;

    @GetMapping("/admin")
    @PreAuthorize("hasRole('ADMINISTRADOR')")
    @Operation(summary = "Panel general del administrador")
    public DashboardDto.Administrador admin() {
        return dashboardService.administrador();
    }

    @GetMapping("/medico")
    @PreAuthorize("hasAnyRole('ADMINISTRADOR','OFTALMOLOGO')")
    @Operation(summary = "Panel diario del especialista")
    public DashboardDto.Medico medico(@RequestParam(required = false) Long oftalmologoId) {
        return dashboardService.medico(oftalmologoId);
    }

    @GetMapping("/recepcion")
    @PreAuthorize("hasAnyRole('ADMINISTRADOR','RECEPCIONISTA')")
    @Operation(summary = "Panel operativo de recepción y triaje")
    public DashboardDto.Recepcion recepcion() {
        return dashboardService.recepcion();
    }

    @GetMapping("/paciente")
    @PreAuthorize("hasAnyRole('PACIENTE','ADMINISTRADOR')")
    @Operation(summary = "Portal de salud visual del paciente")
    public DashboardDto.Portal paciente(@RequestParam(required = false) String email,
                                        @AuthenticationPrincipal String username) {
        return dashboardService.portal(username, email);
    }
}
