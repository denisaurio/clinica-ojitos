package com.clinicaojitos.domain.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * Tratamiento oftalmológico indicado al paciente (RF-04).
 * Cubre los cuatro tipos del prototipo: medicamento, prescripción óptica,
 * terapia visual y procedimiento quirúrgico.
 */
@Entity
@Table(name = "tratamiento")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Tratamiento {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "paciente_id", nullable = false)
    private Paciente paciente;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "oftalmologo_id", nullable = false)
    private Oftalmologo oftalmologo;

    /** Consulta que originó el tratamiento, si aplica. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "consulta_id")
    private Consulta consulta;

    @ManyToOne(fetch = FetchType.EAGER, optional = false)
    @JoinColumn(name = "tipo_id", nullable = false)
    private TipoTratamiento tipo;

    @ManyToOne(fetch = FetchType.EAGER, optional = false)
    @JoinColumn(name = "estado_id", nullable = false)
    private EstadoTratamiento estado;

    // --- Fármaco / prescripción óptica ---
    @Column(length = 150)
    private String medicamento;

    @Column(name = "principio_activo", length = 150)
    private String principioActivo;

    @Column(length = 100)
    private String dosis;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "ojo")
    private Ojo ojo;

    @Column(length = 80)
    private String frecuencia;

    @Column(length = 80)
    private String duracion;

    // --- Procedimiento quirúrgico ---
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "cirugia_id")
    private Cirugia cirugia;

    // --- Plan ---
    @Column(name = "fecha_inicio", nullable = false)
    private LocalDate fechaInicio;

    @Column(name = "fecha_fin")
    private LocalDate fechaFin;

    /** Próxima cita de control (RF4.3). */
    @Column(name = "fecha_control")
    private LocalDate fechaControl;

    @Lob
    @Column(columnDefinition = "TEXT")
    private String indicaciones;

    @Builder.Default
    @Column(nullable = false)
    private Boolean activo = Boolean.TRUE;

    @Column(name = "fecha_creacion", nullable = false)
    private LocalDateTime fechaCreacion;

    @PrePersist
    void alCrear() {
        if (fechaCreacion == null) fechaCreacion = LocalDateTime.now();
        if (activo == null) activo = Boolean.TRUE;
    }

    public String getEstadoCodigo() {
        return estado != null ? estado.getCodigo() : null;
    }
}
