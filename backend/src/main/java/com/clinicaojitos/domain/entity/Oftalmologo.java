package com.clinicaojitos.domain.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;

/**
 * Médico oftalmólogo (RF-05).
 *
 * <p>Regla de negocio RF5.2: {@code numeroColegiatura} es único.
 */
@Entity
@Table(name = "oftalmologo")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Oftalmologo {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 80)
    private String nombres;

    @Column(nullable = false, length = 80)
    private String apellidos;

    @Column(nullable = false, unique = true, length = 150)
    private String email;

    @Column(length = 30)
    private String telefono;

    /** Número de colegiatura. Único (RF5.2). */
    @Column(name = "numero_colegiatura", nullable = false, unique = true, length = 30)
    private String numeroColegiatura;

    @ManyToOne(fetch = FetchType.EAGER, optional = false)
    @JoinColumn(name = "subespecialidad_id", nullable = false)
    private Subespecialidad subespecialidad;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "sede_id")
    private Sede sede;

    @Column(name = "foto_url", length = 255)
    private String fotoUrl;

    @Builder.Default
    @Column(nullable = false)
    private Boolean activo = Boolean.TRUE;

    @Column(name = "fecha_ingreso", nullable = false)
    private LocalDate fechaIngreso;

    @PrePersist
    void alCrear() {
        if (fechaIngreso == null) fechaIngreso = LocalDate.now();
        if (activo == null) activo = Boolean.TRUE;
    }

    public String getNombreCompleto() {
        return nombres + " " + apellidos;
    }

    public String getIniciales() {
        String a = nombres == null || nombres.isBlank() ? "" : nombres.substring(0, 1);
        String b = apellidos == null || apellidos.isBlank() ? "" : apellidos.substring(0, 1);
        return (a + b).toUpperCase();
    }
}
