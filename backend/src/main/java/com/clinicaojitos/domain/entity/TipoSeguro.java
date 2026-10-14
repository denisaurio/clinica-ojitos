package com.clinicaojitos.domain.entity;

import jakarta.persistence.*;
import lombok.*;

/**
 * Catálogo: tipo_seguro.
 * Tabla de referencia administrable sin migración de esquema (RNF-05).
 */
@Entity
@Table(name = "tipo_seguro")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TipoSeguro {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(nullable = false, unique = true, length = 80)
    private String nombre;
}
