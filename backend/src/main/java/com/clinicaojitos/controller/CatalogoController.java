package com.clinicaojitos.controller;

import com.clinicaojitos.domain.dto.CatalogoDto;
import com.clinicaojitos.domain.service.CatalogoService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * Catálogos públicos que alimentan los desplegables del frontend.
 *
 * <p>Son rutas públicas: no contienen información sensible, solo listas de
 * referencia del dominio. Cada catálogo tiene además su propio endpoint para
 * que una pantalla cargue únicamente lo que necesita, en vez de pedir siempre
 * la lista completa.
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

    @GetMapping("/tipos-consulta")
    @Operation(summary = "Tipos de consulta (RF-02)")
    public List<CatalogoDto.Item> tiposConsulta() {
        return catalogoService.todos().tiposConsulta();
    }

    @GetMapping("/subespecialidades")
    @Operation(summary = "Subespecialidades oftalmológicas (RF-05)")
    public List<CatalogoDto.Item> subespecialidades() {
        return catalogoService.todos().subespecialidades();
    }

    @GetMapping("/tipos-tratamiento")
    @Operation(summary = "Tipos de tratamiento (RF-04)")
    public List<CatalogoDto.Item> tiposTratamiento() {
        return catalogoService.todos().tiposTratamiento();
    }

    @GetMapping("/tipos-examen")
    @Operation(summary = "Tipos de examen diagnóstico (RF2.4)")
    public List<CatalogoDto.Item> tiposExamen() {
        return catalogoService.todos().tiposExamen();
    }

    @GetMapping("/seguros")
    @Operation(summary = "Tipos de seguro médico (RF-01)")
    public List<CatalogoDto.Item> seguros() {
        return catalogoService.todos().seguros();
    }

    @GetMapping("/estados-cita")
    @Operation(summary = "Estados posibles de una cita (RF-03)")
    public List<CatalogoDto.Item> estadosCita() {
        return catalogoService.todos().estadosCita();
    }

    @GetMapping("/ojos")
    @Operation(summary = "Lateralesidad OD / OI / AO")
    public List<CatalogoDto.Item> ojos() {
        return catalogoService.todos().ojos();
    }

    @GetMapping("/dias-semana")
    @Operation(summary = "Días de la semana, para la matriz de horarios")
    public List<CatalogoDto.Item> diasSemana() {
        return catalogoService.todos().diasSemana();
    }

    /**
     * Sedes disponibles para registrar un profesional.
     */
    @GetMapping("/sedes")
    @Operation(summary = "Sedes donde se puede registrar un profesional")
    public List<CatalogoDto.Item> sedes() {
        return catalogoService.todos().sedes();
    }

    /**
     * Busca una sede por nombre. El filtro es parcial y no distingue
     * mayúsculas, para que el buscador del formulario encuentre la universidad
     * estea escrita de cualquier manera.
     */
    @GetMapping("/sedes/buscar")
    @Operation(summary = "Busca sedes por nombre (parcial, no distingue mayúsculas)")
    public List<CatalogoDto.Item> buscarSedes(@RequestParam(defaultValue = "") String q) {

        String termino = q == null ? "" : q.trim().toLowerCase();
        return catalogoService.todos().sedes().stream()
                .filter(s -> termino.isEmpty()
                        || (s.nombre() != null
                            && s.nombre().toLowerCase().contains(termino)))
                .toList();
    }
}