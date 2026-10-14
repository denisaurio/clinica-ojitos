package com.clinicaojitos.domain.entity;

import jakarta.persistence.*;
import lombok.*;

/**
 * Catálogo: sede.
 * Tabla de referencia administrable sin migración de esquema (RNF-05).
 */
@Entity
@Table(name = "sede")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Sede {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(nullable = false, unique = true, length = 100)
    private String nombre;

    @Column(length = 255)
    private String direccion;

    @Column(length = 30)
    private String telefono;

    @Builder.Default
    @Column(nullable = false)
    private Boolean activo = Boolean.TRUE;
}
