package com.clinicaojitos.domain.repository;

import com.clinicaojitos.domain.entity.Tratamiento;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * Repositorio de tratamientos (RF-04).
 */
@Repository
public interface TratamientoRepository extends JpaRepository<Tratamiento, Long> {

    /** Plan terapéutico del paciente: los activos primero. */
    @Query("""
            SELECT t FROM Tratamiento t
            JOIN FETCH t.tipo
            JOIN FETCH t.estado
            JOIN FETCH t.oftalmologo
            LEFT JOIN FETCH t.ojo
            WHERE t.paciente.id = :pacienteId
            ORDER BY t.activo DESC, t.fechaInicio DESC
            """)
    List<Tratamiento> listarPorPaciente(@Param("pacienteId") Long pacienteId);

    /** Tratamientos vigentes de un paciente (tarjeta lateral, pantalla 3.6.12). */
    @Query("""
            SELECT t FROM Tratamiento t
            JOIN FETCH t.tipo
            JOIN FETCH t.estado
            WHERE t.paciente.id = :pacienteId
              AND t.activo = true
            ORDER BY t.fechaInicio DESC
            """)
    List<Tratamiento> vigentesPorPaciente(@Param("pacienteId") Long pacienteId);

    long countByPacienteIdAndActivoTrue(Long pacienteId);
}
