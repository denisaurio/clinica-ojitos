package com.clinicaojitos.domain.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * Paciente de la clínica (RF-01).
 *
 * <p>Regla de negocio RF1.2: {@code documento} es único en el sistema.
 * La restricción se aplica en la base de datos mediante el índice
 * {@code uq_paciente_documento} y se valida en {@code PacienteService}.
 */
@Entity
@Table(name = "paciente")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Paciente {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 80)
    private String nombres;

    @Column(nullable = false, length = 80)
    private String apellidos;

    /** DNI o documento de identidad. Único (RF1.2). */
    @Column(nullable = false, unique = true, length = 20)
    private String documento;

    @Column(name = "fecha_nacimiento")
    private LocalDate fechaNacimiento;

    @Column
    private Integer edad;

    @Column(length = 30)
    private String telefono;

    @Column(length = 150)
    private String email;

    @Column(length = 255)
    private String direccion;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "tipo_seguro_id")
    private TipoSeguro tipoSeguro;

    @Column(name = "grupo_sanguineo", length = 5)
    private String grupoSanguineo;

    @Column(name = "foto_url", length = 255)
    private String fotoUrl;

    /** Antecedentes visuales del paciente (RF1.3). */
    @Lob
    @Column(name = "historial_ocular", columnDefinition = "TEXT")
    private String historialOcular;

    /** Alergias medicamentosas (RF1.3). */
    @Lob
    @Column(columnDefinition = "TEXT")
    private String alergias;

    @Builder.Default
    @Column(nullable = false)
    private Boolean activo = Boolean.TRUE;

    @Column(name = "fecha_registro", nullable = false)
    private LocalDateTime fechaRegistro;

    @PrePersist
    void alCrear() {
        if (fechaRegistro == null) fechaRegistro = LocalDateTime.now();
        if (activo == null) activo = Boolean.TRUE;
    }

    public String getNombreCompleto() {
        return nombres + " " + apellidos;
    }

    /** Iniciales para el avatar circular del prototipo. */
    public String getIniciales() {
        String a = nombres == null || nombres.isBlank() ? "" : nombres.substring(0, 1);
        String b = apellidos == null || apellidos.isBlank() ? "" : apellidos.substring(0, 1);
        return (a + b).toUpperCase();
    }
}
