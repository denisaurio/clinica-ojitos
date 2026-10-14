package com.clinicaojitos.domain.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;

/**
 * Procedimiento quirúrgico (RF4.4, pantalla 3.6.13 del prototipo).
 */
@Entity
@Table(name = "cirugia")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Cirugia {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "paciente_id", nullable = false)
    private Paciente paciente;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "oftalmologo_id", nullable = false)
    private Oftalmologo oftalmologo;

    @Column(name = "diagnostico_preop", length = 500)
    private String diagnosticoPreop;

    @Column(name = "tipo_cirugia", nullable = false, length = 120)
    private String tipoCirugia;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "ojo")
    private Ojo ojo;

    @Column(name = "fecha_programada")
    private LocalDate fechaProgramada;

    @Column(name = "fecha_realizada")
    private LocalDate fechaRealizada;

    @Column(length = 60)
    private String anestesia;

    @Lob
    @Column(columnDefinition = "TEXT")
    private String tecnica;

    @Lob
    @Column(columnDefinition = "TEXT")
    private String incidencias;

    /** Modelo de lente intraocular o de injerto. */
    @Column(name = "lente_intraocular", length = 120)
    private String lenteIntraocular;

    @Builder.Default
    @Column(nullable = false, length = 30)
    private String estado = "PROGRAMADA";
}
