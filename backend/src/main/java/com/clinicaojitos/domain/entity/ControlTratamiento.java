package com.clinicaojitos.domain.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * Control o seguimiento de un tratamiento (RF4.5, pantalla 3.6.12).
 */
@Entity
@Table(name = "control_tratamiento")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ControlTratamiento {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "tratamiento_id", nullable = false)
    private Tratamiento tratamiento;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "oftalmologo_id")
    private Oftalmologo oftalmologo;

    @Column(nullable = false)
    private LocalDate fecha;

    /** Completado | Mejora de PIO | Sin Cambios | Pendiente */
    @Column(length = 80)
    private String resultado;

    @Column(name = "pio_od", precision = 5, scale = 2)
    private BigDecimal pioOd;

    @Column(name = "pio_oi", precision = 5, scale = 2)
    private BigDecimal pioOi;

    @Lob
    @Column(columnDefinition = "TEXT")
    private String observaciones;
}
