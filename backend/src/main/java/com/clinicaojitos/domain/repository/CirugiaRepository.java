package com.clinicaojitos.domain.repository;

import com.clinicaojitos.domain.entity.Cirugia;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * Repositorio de procedimientos quirúrgicos (RF4.4).
 */
@Repository
public interface CirugiaRepository extends JpaRepository<Cirugia, Long> {

    List<Cirugia> findByPacienteIdOrderByFechaProgramadaDesc(Long pacienteId);

    long countByOftalmologoIdAndEstado(Long oftalmologoId, String estado);
}
