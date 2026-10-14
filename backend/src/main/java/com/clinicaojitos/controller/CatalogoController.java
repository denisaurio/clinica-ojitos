package com.clinicaojitos.controller;

import com.clinicaojitos.domain.dto.CatalogoDto;
import com.clinicaojitos.domain.service.CatalogoService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Catálogos públicos que alimentan los desplegables del frontend.
 */
@RestController
@RequestMapping("/api/v1/catalogo")
@RequiredArgsConstructor
@Tag(name = "Catálogos", description = "Listas de referencia del dominio oftalmológico")
public class CatalogoController {

    private final CatalogoService catalogoService;

    @GetMapping
    @Operation(summary = "Todos los catálogos en una sola llamada")
    public CatalogoDto.Todos todos() {
        return catalogoService.todos();
    }
}
