package com.clinicaojitos.domain.entity;

import jakarta.persistence.*;
import lombok.*;

/**
 * Catálogo: tipo_examen.
 * Tabla de referencia administrable sin migración de esquema (RNF-05).
 */
@Entity
@Table(name = "tipo_examen")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TipoExamen {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(nullable = false, unique = true, length = 40)
    private String codigo;

    @Column(nullable = false, length = 100)
    private String nombre;
}
