package com.clinicaojitos.controller;

import com.clinicaojitos.domain.dto.CatalogoDto;
import com.clinicaojitos.domain.dto.PacienteDto;
import com.clinicaojitos.domain.service.PacienteService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Endpoints del módulo de pacientes (RF-01).
 */
@RestController
@RequestMapping("/api/v1/pacientes")
@RequiredArgsConstructor
@Tag(name = "Pacientes", description = "Registro y gestión de pacientes (RF-01)")
public class PacienteController {

    private final PacienteService pacienteService;

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMINISTRADOR','RECEPCIONISTA','OFTALMOLOGO')")
    @Operation(summary = "Lista paginada con búsqueda por nombre o documento")
    public Page<PacienteDto.Resumen> listar(
            @RequestParam(required = false) String buscar,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        return pacienteService.buscar(buscar, PageRequest.of(
                Math.max(0, page), Math.min(Math.max(size, 1), 100),
                Sort.by("apellidos").and(Sort.by("nombres"))));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMINISTRADOR','RECEPCIONISTA','OFTALMOLOGO')")
    @Operation(summary = "Ficha del paciente con sus contadores y actividad reciente")
    public PacienteDto.Detalle detalle(@PathVariable Long id) {
        return pacienteService.obtenerDetalle(id);
    }

    @GetMapping("/{id}/actividad-reciente")
    @PreAuthorize("hasAnyRole('ADMINISTRADOR','RECEPCIONISTA','OFTALMOLOGO')")
    @Operation(summary = "Últimas consultas y exámenes del paciente")
    public List<PacienteDto.Actividad> actividad(@PathVariable Long id) {
        return pacienteService.actividadReciente(id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAnyRole('ADMINISTRADOR','RECEPCIONISTA')")
    @Operation(summary = "Registra un paciente nuevo (rechaza documentos duplicados)")
    public PacienteDto.Response registrar(@Valid @RequestBody PacienteDto.Request request) {
        return pacienteService.registrar(request);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMINISTRADOR','RECEPCIONISTA')")
    @Operation(summary = "Actualiza los datos de un paciente")
    public PacienteDto.Response actualizar(@PathVariable Long id,
                                           @Valid @RequestBody PacienteDto.Request request) {
        return pacienteService.actualizar(id, request);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMINISTRADOR')")
    @Operation(summary = "Da de baja lógicamente al paciente sin borrar su historial")
    public ResponseEntity<Void> desactivar(@PathVariable Long id) {
        pacienteService.desactivar(id);
        return ResponseEntity.noContent().build();
    }

    /**
     * Verificación en tiempo real del documento de identidad.
     * Ruta pública para que el formulario de alta valide antes de autenticar.
     */
    @GetMapping("/existe-documento")
    @Operation(summary = "Comprueba si el documento ya está registrado (RF1.2)")
    public CatalogoDto.Existe existeDocumento(@RequestParam String documento) {
        return new CatalogoDto.Existe(pacienteService.documentoExiste(documento));
    }
}
