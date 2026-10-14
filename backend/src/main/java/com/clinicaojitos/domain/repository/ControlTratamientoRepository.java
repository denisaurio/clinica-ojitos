package com.clinicaojitos.domain.repository;

import com.clinicaojitos.domain.entity.ControlTratamiento;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * Repositorio de controles de seguimiento de tratamiento (RF4.5).
 */
@Repository
public interface ControlTratamientoRepository extends JpaRepository<ControlTratamiento, Long> {

    List<ControlTratamiento> findByTratamientoIdOrderByFechaDesc(Long tratamientoId);

    List<ControlTratamiento> findByTratamientoIdOrderByFechaAsc(Long tratamientoId);
}
