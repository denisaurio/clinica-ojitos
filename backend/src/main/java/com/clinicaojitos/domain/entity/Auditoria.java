package com.clinicaojitos.domain.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

/**
 * Bitácora de accesos y operaciones sensibles (RNF-01).
 *
 * <p>El campo {@code username} está desnormalizado a propósito: si la cuenta
 * se elimina, el rastro de auditoría debe sobrevivir.
 */
@Entity
@Table(name = "auditoria")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Auditoria {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "usuario_id")
    private Usuario usuario;

    @Column(length = 60)
    private String username;

    /** LOGIN_OK, LOGIN_FAIL, VER_HISTORIAL, CREAR, ACTUALIZAR, ELIMINAR... */
    @Column(nullable = false, length = 60)
    private String accion;

    @Column(length = 60)
    private String recurso;

    @Column(name = "recurso_id")
    private Long recursoId;

    @Column(length = 500)
    private String descripcion;

    @Column(name = "ip_address", length = 45)
    private String ipAddress;

    @Column(length = 120)
    private String navegador;

    @Builder.Default
    @Column(nullable = false, length = 30)
    private String resultado = "EXITOSO";

    @Column(nullable = false)
    private LocalDateTime fecha;

    @PrePersist
    void alCrear() {
        if (fecha == null) fecha = LocalDateTime.now();
        if (resultado == null) resultado = "EXITOSO";
    }
}
