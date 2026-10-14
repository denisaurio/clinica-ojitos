package com.clinicaojitos.domain.entity;

import jakarta.persistence.*;
import lombok.*;

/**
 * Vínculo entre la cuenta de acceso y la ficha profesional del oftalmólogo.
 */
@Entity
@Table(name = "usuario_oftalmologo")
@IdClass(UsuarioOftalmologoId.class)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UsuarioOftalmologo {

    @Id
    @Column(name = "usuario_id")
    private Long usuarioId;

    @Id
    @Column(name = "oftalmologo_id")
    private Long oftalmologoId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "usuario_id", insertable = false, updatable = false)
    private Usuario usuario;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "oftalmologo_id", insertable = false, updatable = false)
    private Oftalmologo oftalmologo;
}
