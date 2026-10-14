package com.clinicaojitos.domain.repository;

import com.clinicaojitos.domain.entity.Cita;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.Optional;

/**
 * Repositorio de citas médicas (RF-03).
 */
@Repository
public interface CitaRepository extends JpaRepository<Cita, Long> {

    /**
     * RF3.2 — control de cruce de horario.
     * Busca otra cita del mismo oftalmólogo que ocupe exactamente ese turno.
     * La comparación ignora la cita que se está reprogramando ({@code idExcluido}).
     */
    @Query("""
            SELECT COUNT(c) FROM Cita c
            WHERE c.oftalmologo.id = :oftalmologoId
              AND c.fecha       = :fecha
              AND c.horaInicio = :horaInicio
              AND c.bloqueo     = true
              AND (:idExcluido IS NULL OR c.id <> :idExcluido)
            """)
    long contarSolapes(@Param("oftalmologoId") Long oftalmologoId,
                       @Param("fecha") LocalDate fecha,
                       @Param("horaInicio") LocalTime horaInicio,
                       @Param("idExcluido") Long idExcluido);

    /** Agenda de un profesional en un rango de fechas (pantalla 3.6.7). */
    @Query("""
            SELECT c FROM Cita c
            JOIN FETCH c.paciente
            JOIN FETCH c.oftalmologo o
            LEFT JOIN FETCH c.tipoConsulta
            WHERE (:oftalmologoId IS NULL OR c.oftalmologo.id = :oftalmologoId)
              AND c.fecha BETWEEN :desde AND :hasta
              AND c.bloqueo = true
            ORDER BY c.fecha, c.horaInicio
            """)
    List<Cita> buscarAgenda(@Param("oftalmologoId") Long oftalmologoId,
                            @Param("desde") LocalDate desde,
                            @Param("hasta") LocalDate hasta);

    /** Agenda de un profesional para un día concreto. */
    @Query("""
            SELECT c FROM Cita c
            JOIN FETCH c.paciente
            LEFT JOIN FETCH c.tipoConsulta
            WHERE c.oftalmologo.id = :oftalmologoId
              AND c.fecha = :fecha
              AND c.bloqueo = true
            ORDER BY c.horaInicio
            """)
    List<Cita> agendaDelDia(@Param("oftalmologoId") Long oftalmologoId,
                            @Param("fecha") LocalDate fecha);

    /** Todas las citas de una fecha, para el panel de recepción. */
    @Query("""
            SELECT c FROM Cita c
            JOIN FETCH c.paciente
            JOIN FETCH c.oftalmologo o
            LEFT JOIN FETCH c.tipoConsulta
            WHERE c.fecha = :fecha
              AND c.bloqueo = true
            ORDER BY c.horaInicio
            """)
    List<Cita> citasDelDia(@Param("fecha") LocalDate fecha);

    /** Próximas citas de un paciente (portal del paciente, pantalla 3.6.24). */
    @Query("""
            SELECT c FROM Cita c
            JOIN FETCH c.oftalmologo o
            LEFT JOIN FETCH o.subespecialidad
            WHERE c.paciente.id = :pacienteId
              AND c.bloqueo = true
              AND c.fecha >= :desde
            ORDER BY c.fecha, c.horaInicio
            """)
    List<Cita> proximasCitas(@Param("pacienteId") Long pacienteId,
                             @Param("desde") LocalDate desde);

    long countByFechaAndBloqueoTrue(LocalDate fecha);

    long countByBloqueoTrue();

    long countByPacienteIdAndBloqueoTrue(Long pacienteId);

    @Query("""
            SELECT COUNT(c) FROM Cita c
            WHERE c.oftalmologo.id = :oftalmologoId AND c.bloqueo = true
            """)
    long countByOftalmologo(@Param("oftalmologoId") Long oftalmologoId);

    @Query("""
            SELECT COUNT(c) FROM Cita c
            WHERE c.oftalmologo.id = :oftalmologoId
              AND c.fecha = :fecha AND c.bloqueo = true
            """)
    long countByOftalmologoYFecha(@Param("oftalmologoId") Long oftalmologoId,
                                  @Param("fecha") LocalDate fecha);

    @Query("""
            SELECT COUNT(DISTINCT c.paciente.id) FROM Cita c
            WHERE c.oftalmologo.id = :oftalmologoId AND c.bloqueo = true
            """)
    long countDistinctPacientesPorOftalmologo(@Param("oftalmologoId") Long oftalmologoId);

    Optional<Cita> findByIdAndPacienteId(Long id, Long pacienteId);
}
