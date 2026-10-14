package com.clinicaojitos.controller;

import com.clinicaojitos.domain.dto.ApiDto;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Verificación del estado de la API (Fase 4, APF1).
 * Ruta pública: confirma que el servicio está activo.
 */
@RestController
@RequestMapping("/api/v1")
public class EstadoController {

    @GetMapping("/estado")
    public ApiDto.Estado estado() {
        Map<String, Object> modulos = new LinkedHashMap<>();
        modulos.put("RF-01", "Pacientes");
        modulos.put("RF-02", "Historial médico");
        modulos.put("RF-03", "Citas médicas");
        modulos.put("RF-04", "Tratamientos");
        modulos.put("RF-05", "Oftalmólogos");
        modulos.put("RF-06", "Seguridad y roles");

        return new ApiDto.Estado(
                "API Clínica Oftalmológica Ojitos",
                "1.0.0",
                "ACTIVA",
                "Fase 6 — Seguridad (JWT + roles)",
                LocalDateTime.now(),
                modulos);
    }
}
