package com.clinicaojitos.controller;

import com.clinicaojitos.domain.dto.OftalmologoDto;
import com.clinicaojitos.domain.service.AuthService;
import com.clinicaojitos.domain.service.OftalmologoService;
import com.clinicaojitos.exception.AccesoDenegadoException;
import com.clinicaojitos.security.SecurityUtils;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Endpoints del directorio de oftalmólogos (RF-05).
 */
@RestController
@RequestMapping("/api/v1/oftalmologos")
@RequiredArgsConstructor
@Tag(name = "Oftalmólogos", description = "Directorio médico y horarios (RF-05)")
public class OftalmologoController {

    private final OftalmologoService oftalmologoService;
    private final AuthService authService;

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMINISTRADOR','RECEPCIONISTA','OFTALMOLOGO')")
    @Operation(summary = "Directorio con búsqueda por nombre, colegiatura o subespecialidad")
    public Page<OftalmologoDto.Response> listar(
            @RequestParam(required = false) String buscar,
            @RequestParam(required = false) Boolean activo,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return oftalmologoService.buscar(buscar, activo, PageRequest.of(
                Math.max(0, page), Math.min(Math.max(size, 1), 100),
                Sort.by("apellidos").and(Sort.by("nombres"))));
    }

    @GetMapping("/activos")
    @PreAuthorize("hasAnyRole('ADMINISTRADOR','RECEPCIONISTA','OFTALMOLOGO','PACIENTE')")
    @Operation(summary = "Profesionales activos, para los desplegables de la agenda")
    public List<OftalmologoDto.Response> activos() {
        return oftalmologoService.listarActivos();
    }

    /** Ficha del oftalmólogo que inició sesión (para "Mi horario"). */
    @GetMapping("/yo")
    @PreAuthorize("hasRole('OFTALMOLOGO')")
    @Operation(summary = "Ficha del oftalmólogo con sesión iniciada")
    public OftalmologoDto.Response yo() {
        return oftalmologoService.obtener(oftalmologoPropio());
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMINISTRADOR','RECEPCIONISTA','OFTALMOLOGO')")
    @Operation(summary = "Ficha del profesional")
    public OftalmologoDto.Response obtener(@PathVariable Long id) {
        return oftalmologoService.obtener(id);
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMINISTRADOR')")
    @Operation(summary = "Registra un oftalmólogo y devuelve sus credenciales de primer ingreso")
    public OftalmologoDto.AltaConCredenciales registrar(@Valid @RequestBody OftalmologoDto.Request request) {
        return oftalmologoService.registrar(request);
    }

    /**
     * Fija una contraseña nueva para el profesional: la que escribe el
     * administrador o, si viene vacía, una aleatoria. La anterior no se puede
     * recuperar: la base solo guarda el hash BCrypt.
     */
    @PostMapping("/{id}/credenciales")
    @PreAuthorize("hasRole('ADMINISTRADOR')")
    @Operation(summary = "Cambia la contraseña de acceso del profesional (elegida o aleatoria)")
    public OftalmologoDto.Credenciales credenciales(
            @PathVariable Long id,
            @Valid @RequestBody(required = false) OftalmologoDto.ClaveRequest request) {
        return oftalmologoService.regenerarCredenciales(id, request == null ? null : request.password());
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMINISTRADOR')")
    @Operation(summary = "Actualiza los datos del profesional")
    public OftalmologoDto.Response actualizar(
            @PathVariable Long id, @Valid @RequestBody OftalmologoDto.Request request) {
        return oftalmologoService.actualizar(id, request);
    }

    @PatchMapping("/{id}/desactivar")
    @PreAuthorize("hasRole('ADMINISTRADOR')")
    @Operation(summary = "Suspende el perfil operativo conservando su historial")
    public OftalmologoDto.Response desactivar(@PathVariable Long id) {
        return oftalmologoService.desactivar(id);
    }

    // --------------------------- Horarios --------------------------------

    @GetMapping("/{id}/horarios")
    @PreAuthorize("hasAnyRole('ADMINISTRADOR','RECEPCIONISTA','OFTALMOLOGO')")
    @Operation(summary = "Matriz de disponibilidad semanal")
    public List<OftalmologoDto.HorarioResponse> horarios(@PathVariable Long id) {
        return oftalmologoService.horarios(id);
    }

    @PutMapping("/{id}/horarios")
    @PreAuthorize("hasAnyRole('ADMINISTRADOR','OFTALMOLOGO')")
    @Operation(summary = "Reemplaza la matriz de disponibilidad semanal (el médico, solo la suya)")
    public List<OftalmologoDto.HorarioResponse> guardarHorarios(
            @PathVariable Long id,
            @Valid @RequestBody OftalmologoDto.HorariosRequest request) {
        if (SecurityUtils.esOftalmologo() && !id.equals(oftalmologoPropio())) {
            throw new AccesoDenegadoException("Solo puede modificar su propio horario.");
        }
        return oftalmologoService.guardarHorarios(id, request);
    }

    private Long oftalmologoPropio() {
        Long propio = SecurityUtils.usernameActual().map(authService::oftalmologoIdDe).orElse(null);
        if (propio == null) {
            throw new AccesoDenegadoException("Su cuenta no está vinculada a una ficha de oftalmólogo.");
        }
        return propio;
    }

    @GetMapping("/{id}/metricas")
    @PreAuthorize("hasAnyRole('ADMINISTRADOR','OFTALMOLOGO')")
    @Operation(summary = "Carga asistencial y satisfacción del profesional")
    public OftalmologoDto.Metricas metricas(@PathVariable Long id) {
        return oftalmologoService.metricas(id);
    }

    /** Verificación en tiempo real desde el formulario de alta (pantalla 3.6.16). */
    @GetMapping("/existe-colegiatura")
    @PreAuthorize("hasRole('ADMINISTRADOR')")
    @Operation(summary = "Comprueba si la colegiatura ya está registrada (RF5.2)")
    public OftalmologoDto.ColegiaturaExiste existeColegiatura(@RequestParam String numero) {
        return oftalmologoService.existeColegiatura(numero);
    }
}
