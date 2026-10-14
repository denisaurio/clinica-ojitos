package com.clinicaojitos.controller;

import com.clinicaojitos.domain.dto.AuthDto;
import com.clinicaojitos.domain.service.AuthService;
import com.clinicaojitos.security.SecurityUtils;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * Endpoints de autenticación y control de acceso (RF-06).
 */
@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
@Tag(name = "Autenticación", description = "Inicio de sesión, perfil y recuperación (RF-06)")
public class AuthController {

    private final AuthService authService;

    @PostMapping("/login")
    @Operation(summary = "Inicia sesión y devuelve un token JWT")
    public AuthDto.TokenResponse login(@Valid @RequestBody AuthDto.LoginRequest request,
                                       HttpServletRequest httpRequest) {
        return authService.login(request, httpRequest);
    }

    @PostMapping("/refresh")
    @Operation(summary = "Emite un token nuevo a partir de uno vigente")
    public AuthDto.TokenResponse refrescar(@Valid @RequestBody AuthDto.RefreshRequest request) {
        return authService.refrescar(request.refreshToken());
    }

    @GetMapping("/me")
    @Operation(summary = "Perfil del usuario autenticado")
    public AuthDto.PerfilResponse perfil(@AuthenticationPrincipal String username) {
        return authService.perfil(username);
    }

    @PostMapping("/recuperar-clave")
    @Operation(summary = "Solicita el enlace de recuperación de contraseña (RF6.4)")
    public ResponseEntity<Map<String, String>> recuperar(
            @Valid @RequestBody AuthDto.RecuperarClaveRequest request) {
        authService.solicitarRecuperacion(request.email());
        return ResponseEntity.ok(Map.of(
                "mensaje", "Si el correo está registrado, recibirá las instrucciones de recuperación."));
    }

    @GetMapping("/intentos")
    @Operation(summary = "Consultas el estado de la cuenta y los intentos disponibles")
    public ResponseEntity<Map<String, Object>> estadoCuenta(@AuthenticationPrincipal String username) {
        var perfil = authService.perfil(username);
        return ResponseEntity.ok(Map.of(
                "username", perfil.username(),
                "rol", perfil.rol(),
                "intentosRestantes", AuthService.MAX_INTENTOS,
                "activo", perfil.activo()));
    }

    @PostMapping("/logout")
    @Operation(summary = "Cierre de sesión del lado del cliente")
    public ResponseEntity<Map<String, String>> logout() {
        return ResponseEntity.ok(Map.of("mensaje", "Sesión cerrada."));
    }
}
