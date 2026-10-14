package com.clinicaojitos.domain.entity;

import java.io.Serializable;
import java.util.Objects;

/**
 * Clave compuesta de {@link UsuarioOftalmologo}.
 *
 * <p>La tabla puente {@code usuario_oftalmologo} tiene dos claves primarias
 * y ningún identificador propio, por lo que JPA necesita conocer esta clase
 * para reconstruir la identidad de la entidad.
 */
public class UsuarioOftalmologoId implements Serializable {

    private static final long serialVersionUID = 1L;

    private Long usuarioId;
    private Long oftalmologoId;

    public UsuarioOftalmologoId() {
    }

    public UsuarioOftalmologoId(Long usuarioId, Long oftalmologoId) {
        this.usuarioId = usuarioId;
        this.oftalmologoId = oftalmologoId;
    }

    public Long getUsuarioId() {
        return usuarioId;
    }

    public void setUsuarioId(Long usuarioId) {
        this.usuarioId = usuarioId;
    }

    public Long getOftalmologoId() {
        return oftalmologoId;
    }

    public void setOftalmologoId(Long oftalmologoId) {
        this.oftalmologoId = oftalmologoId;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof UsuarioOftalmologoId that)) return false;
        return Objects.equals(usuarioId, that.usuarioId)
                && Objects.equals(oftalmologoId, that.oftalmologoId);
    }

    @Override
    public int hashCode() {
        return Objects.hash(usuarioId, oftalmologoId);
    }
}