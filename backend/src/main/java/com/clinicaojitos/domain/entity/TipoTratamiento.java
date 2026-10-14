package com.clinicaojitos.domain.entity;

import jakarta.persistence.*;
import lombok.*;

/**
 * Catálogo: tipo_tratamiento.
 * Tabla de referencia administrable sin migración de esquema (RNF-05).
 */
@Entity
@Table(name = "tipo_tratamiento")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TipoTratamiento {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(nullable = false, unique = true, length = 40)
    private String codigo;

    @Column(nullable = false, length = 80)
    private String nombre;
}
