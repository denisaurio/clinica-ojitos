package com.clinicaojitos.domain.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Consulta oftalmológica registrada en el historial médico (RF-02).
 *
 * <p>Contiene los signos vitales oculares capturados en la pantalla 3.6.6
 * del prototipo (agudeza de Snellen y tonometría por ojo) y el diagnóstico
 * estructurado con notas SOAP.
 */
@Entity
@Table(name = "consulta")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Consulta {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "paciente_id", nullable = false)
    private Paciente paciente;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "oftalmologo_id", nullable = false)
    private Oftalmologo oftalmologo;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "sede_id")
    private Sede sede;

    @Column(nullable = false)
    private LocalDateTime fecha;

    @ManyToOne(fetch = FetchType.EAGER, optional = false)
    @JoinColumn(name = "tipo_consulta_id", nullable = false)
    private TipoConsulta tipoConsulta;

    // --- Signos vitales oculares ---
    @Column(name = "agudeza_od", length = 10)
    private String agudezaOd;

    @Column(name = "agudeza_oi", length = 10)
    private String agudezaOi;

    @Column(name = "pio_od", precision = 5, scale = 2)
    private BigDecimal pioOd;

    @Column(name = "pio_oi", precision = 5, scale = 2)
    private BigDecimal pioOi;

    // --- Hallazgos ---
    @Column(length = 80)
    private String pupilas;

    @Lob
    @Column(columnDefinition = "TEXT")
    private String biomicroscopia;

    @Lob
    @Column(name = "fondo_ojo", columnDefinition = "TEXT")
    private String fondoOjo;

    // --- Diagnóstico ---
    @Column(nullable = false, length = 500)
    private String diagnostico;

    @Column(length = 10)
    private String cie10;

    // --- Notas SOAP ---
    @Lob
    @Column(name = "soap_subjetivo", columnDefinition = "TEXT")
    private String soapSubjetivo;

    @Lob
    @Column(name = "soap_objetivo", columnDefinition = "TEXT")
    private String soapObjetivo;

    @Lob
    @Column(name = "soap_evaluacion", columnDefinition = "TEXT")
    private String soapEvaluacion;

    @Lob
    @Column(name = "soap_plan", columnDefinition = "TEXT")
    private String soapPlan;

    @Lob
    @Column(columnDefinition = "TEXT")
    private String observaciones;

    @Column(name = "fecha_creacion", nullable = false)
    private LocalDateTime fechaCreacion;

    @PrePersist
    void alCrear() {
        if (fechaCreacion == null) fechaCreacion = LocalDateTime.now();
    }
}
