package com.clinicaojitos.domain.repository;

import com.clinicaojitos.domain.entity.Examen;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * Repositorio de estudios diagnósticos adjuntos (RF2.4).
 */
@Repository
public interface ExamenRepository extends JpaRepository<Examen, Long> {

    List<Examen> findByConsultaIdOrderByFechaDesc(Long consultaId);

    List<Examen> findByPacienteIdOrderByFechaDesc(Long pacienteId);

    long countByConsultaId(Long consultaId);
}
