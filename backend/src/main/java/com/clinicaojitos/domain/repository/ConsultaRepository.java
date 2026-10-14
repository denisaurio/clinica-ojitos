package com.clinicaojitos.domain.repository;

import com.clinicaojitos.domain.entity.Consulta;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * Repositorio del historial médico oftalmológico (RF-02).
 */
@Repository
public interface ConsultaRepository extends JpaRepository<Consulta, Long> {

    /**
     * JPQL: evolución cronológica de un paciente.
     * Es la consulta que alimenta la línea de tiempo (pantalla 3.6.5).
     */
    @Query("""
            SELECT c FROM Consulta c
            JOIN FETCH c.oftalmologo o
            LEFT JOIN FETCH c.tipoConsulta
            WHERE c.paciente.id = :pacienteId
            ORDER BY c.fecha DESC
            """)
    List<Consulta> listarPorPaciente(@Param("pacienteId") Long pacienteId);

    @Query(value = """
            SELECT c FROM Consulta c
            JOIN FETCH c.oftalmologo
            LEFT JOIN FETCH c.tipoConsulta
            WHERE c.paciente.id = :pacienteId
            """,
            countQuery = """
            SELECT COUNT(c) FROM Consulta c
            WHERE c.paciente.id = :pacienteId
            """)
    Page<Consulta> listarPorPacientePaginado(@Param("pacienteId") Long pacienteId,
                                              Pageable pageable);

    /**
     * JPQL: serie temporal de presión intraocular para la gráfica de evolución
     * (pantalla 3.6.4). Solo trae las consultas que tienen al menos una
     * medición de PIO.
     */
    @Query("""
            SELECT c FROM Consulta c
            WHERE c.paciente.id = :pacienteId
              AND (c.pioOd IS NOT NULL OR c.pioOi IS NOT NULL)
            ORDER BY c.fecha ASC
            """)
    List<Consulta> evolucionPio(@Param("pacienteId") Long pacienteId);

    /** Diagnósticos vigentes del paciente, del más reciente al más antiguo. */
    @Query("""
            SELECT c FROM Consulta c
            WHERE c.paciente.id = :pacienteId
            ORDER BY c.fecha DESC
            """)
    List<Consulta> diagnosticosPorPaciente(@Param("pacienteId") Long pacienteId);

    long countByPacienteId(Long pacienteId);

    @Query("""
            SELECT COUNT(c) FROM Consulta c
            WHERE c.oftalmologo.id = :oftalmologoId
              AND c.fecha >= :desde
            """)
    long countByOftalmologoDesde(@Param("oftalmologoId") Long oftalmologoId,
                                  @Param("desde") java.time.LocalDateTime desde);
}
