package com.clinicaojitos.domain.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

/**
 * Cita médica (RF-03).
 *
 * <p>Regla de negocio RF3.2: un oftalmólogo no puede tener dos citas en el
 * mismo horario. La base de datos lo garantiza con el índice único
 * {@code uq_cita_agenda} sobre la columna generada {@code slot_ocupado},
 * que solo toma valor cuando {@code bloqueo} es verdadero. Así una cita
 * cancelada libera el turno sin chocar con las demás.
 */
@Entity
@Table(name = "cita")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Cita {

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

    @Column(length = 20)
    private String consultorio;

    @Column(nullable = false)
    private LocalDate fecha;

    @Column(name = "hora_inicio", nullable = false)
    private LocalTime horaInicio;

    @Column(name = "hora_fin", nullable = false)
    private LocalTime horaFin;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "tipo_consulta_id")
    private TipoConsulta tipoConsulta;

    @ManyToOne(fetch = FetchType.EAGER, optional = false)
    @JoinColumn(name = "estado_cita_id", nullable = false)
    private EstadoCita estadoCita;

    @Column(length = 255)
    private String motivo;

    @Column(name = "nota_interna", length = 500)
    private String notaInterna;

    /** 1 = ocupa la agenda; 0 = turno liberado (cancelada). */
    @Builder.Default
    @Column(nullable = false)
    private Boolean bloqueo = Boolean.TRUE;

    @Column(name = "fecha_creacion", nullable = false)
    private LocalDateTime fechaCreacion;

    @PrePersist
    void alCrear() {
        if (fechaCreacion == null) fechaCreacion = LocalDateTime.now();
        if (bloqueo == null) bloqueo = Boolean.TRUE;
    }

    /** Estado en código legible: PROGRAMADA, CONFIRMADA, CANCELADA... */
    public String getEstado() {
        return estadoCita != null ? estadoCita.getCodigo() : null;
    }

    public boolean estaCancelada() {
        return estadoCita != null && "CANCELADA".equals(estadoCita.getCodigo());
    }

    public boolean ocupaAgenda() {
        return Boolean.TRUE.equals(bloqueo) && !estaCancelada();
    }
}
