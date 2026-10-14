package com.clinicaojitos.domain.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

/**
 * Estudio diagnóstico adjunto a una consulta (RF2.4).
 */
@Entity
@Table(name = "examen")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Examen {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "consulta_id", nullable = false)
    private Consulta consulta;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "paciente_id", nullable = false)
    private Paciente paciente;

    @ManyToOne(fetch = FetchType.EAGER, optional = false)
    @JoinColumn(name = "tipo_examen_id", nullable = false)
    private TipoExamen tipoExamen;

    @Column(name = "archivo_url", nullable = false, length = 255)
    private String archivoUrl;

    @Column(name = "nombre_archivo", length = 200)
    private String nombreArchivo;

    @Column(name = "mime_type", length = 80)
    private String mimeType;

    @Column(length = 500)
    private String descripcion;

    @Column(nullable = false)
    private LocalDateTime fecha;

    @PrePersist
    void alCrear() {
        if (fecha == null) fecha = LocalDateTime.now();
    }
}
