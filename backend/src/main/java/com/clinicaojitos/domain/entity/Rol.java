package com.clinicaojitos.domain.entity;

import jakarta.persistence.*;
import lombok.*;

/**
 * Catálogo: rol.
 * Tabla de referencia administrable sin migración de esquema (RNF-05).
 */
@Entity
@Table(name = "rol")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Rol {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(nullable = false, unique = true, length = 30)
    private String codigo;

    @Column(nullable = false, length = 60)
    private String nombre;

    @Column(length = 255)
    private String descripcion;
}
