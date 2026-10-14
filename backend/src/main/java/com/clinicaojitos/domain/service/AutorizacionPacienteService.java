package com.clinicaojitos.domain.service;

import com.clinicaojitos.domain.entity.Paciente;
import com.clinicaojitos.domain.entity.Usuario;
import com.clinicaojitos.domain.repository.PacienteRepository;
import com.clinicaojitos.domain.repository.UsuarioRepository;
import com.clinicaojitos.exception.AccesoDenegadoException;
import com.clinicaojitos.exception.RecursoNoEncontradoException;
import com.clinicaojitos.security.SecurityUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Comprueba a quién pertenece una ficha de paciente (RF-02, RNF-01).
 *
 * <p>Los endpoints como {@code /historiales/paciente/{id}} reciben el identificador
 * en la URL. El guard del frontend evita que se llegue a la pantalla, pero
 * cualquiera puede escribir la URL a mano: la comprobación real tiene que estar
 * aquí, no en la interfaz.
 *
 * <p>Los roles {@code OFTALMOLOGO} y {@code ADMINISTRADOR} ven todas las fichas;
 * el {@code PACIENTE} solo la suya.
 */
@Service
@RequiredArgsConstructor
public class AutorizacionPacienteService {

    private final UsuarioRepository usuarioRepository;
    private final PacienteRepository pacienteRepository;

    /** Lanza {@code AccesoDenegadoException} si el usuario no puede leer esa ficha. */
    @Transactional(readOnly = true)
    public void exigirAcceso(Long pacienteId) {
        if (pacienteId == null) {
            throw new RecursoNoEncontradoException("No se indicó de qué paciente se trata.");
        }
        if (!puedeVer(pacienteId)) {
            // Se responde 403 y no 404 a propósito: el usuario ya sabe que el
            // recurso existe, y mentir ocultaría un fallo de permisos real.
            throw new AccesoDenegadoException(
                    "Solo puede consultar su propia información clínica.");
        }
    }

    @Transactional(readOnly = true)
    public boolean puedeVer(Long pacienteId) {
        String rol = SecurityUtils.rolActual().orElse(null);
        if (rol == null) {
            return false;
        }
        if ("ADMINISTRADOR".equals(rol) || "OFTALMOLOGO".equals(rol)) {
            return true;
        }
        if (!"PACIENTE".equals(rol)) {
            // RECEPCIONISTA: atiende la agenda, pero el historial clínico lo
            // consulta el profesional tratante, no el personal de mostrador.
            return false;
        }
        return esSuPropiaFicha(pacienteId);
    }

    /** La ficha del paciente autenticado, por el correo de su cuenta. */
    @Transactional(readOnly = true)
    public boolean esSuPropiaFicha(Long pacienteId) {
        return suPropiaFichaOpcional()
                .map(Paciente::getId)
                .filter(pacienteId::equals)
                .isPresent();
    }

    /** Ficha propia del paciente autenticado; lanza 404 si no tiene ninguna. */
    @Transactional(readOnly = true)
    public Paciente suPropiaFicha() {
        return suPropiaFichaOpcional()
                .orElseThrow(() -> new RecursoNoEncontradoException(
                        "Esta cuenta no tiene una ficha de paciente asociada."));
    }

    private java.util.Optional<Paciente> suPropiaFichaOpcional() {
        return SecurityUtils.usernameActual()
                .flatMap(usuarioRepository::findByUsernameIgnoreCase)
                .map(Usuario::getEmail)
                .flatMap(correo -> pacienteRepository.findByEmailParaAcceso(correo));
    }
}
