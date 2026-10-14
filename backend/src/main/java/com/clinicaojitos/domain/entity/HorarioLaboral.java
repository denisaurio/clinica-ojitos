package com.clinicaojitos.domain.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalTime;

/**
 * Bloque de disponibilidad semanal de un oftalmólogo (RF-05.4).
 * El prototipo lo edita con arrastrar y soltar (pantalla 3.6.17).
 */
@Entity
@Table(name = "horario_laboral")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class HorarioLaboral {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "oftalmologo_id", nullable = false)
    private Oftalmologo oftalmologo;

    @ManyToOne(fetch = FetchType.EAGER, optional = false)
    @JoinColumn(name = "dia_semana_id", nullable = false)
    private DiaSemana diaSemana;

    @Column(name = "hora_inicio", nullable = false)
    private LocalTime horaInicio;

    @Column(name = "hora_fin", nullable = false)
    private LocalTime horaFin;

    @ManyToOne(fetch = FetchType.EAGER, optional = false)
    @JoinColumn(name = "tipo_bloque_id", nullable = false)
    private TipoBloqueHorario tipoBloque;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "sede_id")
    private Sede sede;

    @Builder.Default
    @Column(nullable = false)
    private Boolean activo = Boolean.TRUE;
}
