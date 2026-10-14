package com.clinicaojitos.domain.repository;

import com.clinicaojitos.domain.entity.EstadoTratamiento;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/**
 * Repositorio del catálogo EstadoTratamiento.
 */
@Repository
public interface EstadoTratamientoRepository extends JpaRepository<EstadoTratamiento, Integer> {

    Optional<EstadoTratamiento> findByCodigo(String codigo);
    List<EstadoTratamiento> findAllByOrderByIdAsc();
}
