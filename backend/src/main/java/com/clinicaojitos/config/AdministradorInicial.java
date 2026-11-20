package com.clinicaojitos.config;

import com.clinicaojitos.domain.entity.Rol;
import com.clinicaojitos.domain.entity.Usuario;
import com.clinicaojitos.domain.repository.RolRepository;
import com.clinicaojitos.domain.repository.UsuarioRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

/**
 * Garantiza al arrancar la cuenta administradora definida en el entorno
 * ({@code ADMIN_USERNAME}, {@code ADMIN_PASSWORD}, {@code ADMIN_EMAIL}).
 *
 * <p>Sustituye en despliegue a la clave conocida de {@code sql/04}: la
 * contraseña nunca está en el repositorio, solo en las variables del servidor,
 * y se guarda con BCrypt (RNF-01).
 *
 * <ul>
 *   <li>Si las variables están vacías, no hace nada.</li>
 *   <li>Si la cuenta no existe, la crea con rol {@code ADMINISTRADOR}.</li>
 *   <li>Si existe, no toca su clave salvo que {@code ADMIN_FORZAR_CLAVE=true}:
 *       así un cambio hecho desde «Mi cuenta» sobrevive a los reinicios.</li>
 * </ul>
 */
@Slf4j
@Order(2)
@Component
public class AdministradorInicial implements ApplicationRunner {

    static final String ROL_ADMINISTRADOR = "ADMINISTRADOR";

    private final UsuarioRepository usuarioRepository;
    private final RolRepository rolRepository;
    private final PasswordEncoder passwordEncoder;
    private final String username;
    private final String password;
    private final String email;
    private final boolean forzarClave;

    public AdministradorInicial(UsuarioRepository usuarioRepository,
                                RolRepository rolRepository,
                                PasswordEncoder passwordEncoder,
                                @Value("${app.admin.username:}") String username,
                                @Value("${app.admin.password:}") String password,
                                @Value("${app.admin.email:}") String email,
                                @Value("${app.admin.forzar-clave:false}") boolean forzarClave) {
        this.usuarioRepository = usuarioRepository;
        this.rolRepository = rolRepository;
        this.passwordEncoder = passwordEncoder;
        this.username = username == null ? "" : username.trim();
        this.password = password == null ? "" : password;
        this.email = email == null ? "" : email.trim();
        this.forzarClave = forzarClave;
    }

    @Override
    public void run(ApplicationArguments args) {
        try {
            asegurar();
        } catch (RuntimeException e) {
            // Un fallo aquí no debe tumbar la API: se avisa y se sigue.
            log.error("No se pudo garantizar la cuenta administradora: {}", e.getMessage());
        }
    }

    /** @return la acción realizada, útil para las pruebas y el log. */
    @Transactional
    public Resultado asegurar() {
        if (username.isEmpty() || password.isEmpty()) {
            log.info("ADMIN_USERNAME / ADMIN_PASSWORD no definidos: no se crea administrador inicial.");
            return Resultado.OMITIDO;
        }
        if (password.length() < 8) {
            log.warn("ADMIN_PASSWORD tiene menos de 8 caracteres: no se crea la cuenta {}.", username);
            return Resultado.CLAVE_DEBIL;
        }

        Optional<Usuario> existente = usuarioRepository.findByUsernameIgnoreCase(username);
        if (existente.isPresent()) {
            Usuario usuario = existente.get();
            if (!forzarClave) {
                log.info("Administrador inicial '{}' ya existe; se respeta su contraseña.", username);
                return Resultado.SIN_CAMBIOS;
            }
            usuario.setPasswordHash(passwordEncoder.encode(password));
            usuario.setActivo(Boolean.TRUE);
            usuario.setIntentosFallidos(0);
            usuarioRepository.save(usuario);
            log.warn("Se restableció la contraseña del administrador '{}' (ADMIN_FORZAR_CLAVE=true).", username);
            return Resultado.CLAVE_RESTABLECIDA;
        }

        Rol rol = rolRepository.findByCodigo(ROL_ADMINISTRADOR)
                .orElseThrow(() -> new IllegalStateException(
                        "Falta el rol ADMINISTRADOR: ejecuta sql/01_esquema.sql."));

        usuarioRepository.save(Usuario.builder()
                .username(username)
                .passwordHash(passwordEncoder.encode(password))
                .email(email.isEmpty() ? username + "@clinicaojitos.pe" : email)
                .rol(rol)
                .activo(Boolean.TRUE)
                .intentosFallidos(0)
                .build());
        log.info("Administrador inicial '{}' creado desde las variables de entorno.", username);
        return Resultado.CREADO;
    }

    public enum Resultado { OMITIDO, CLAVE_DEBIL, SIN_CAMBIOS, CLAVE_RESTABLECIDA, CREADO }
}
