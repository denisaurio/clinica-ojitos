package com.clinicaojitos.domain.repository;

import com.clinicaojitos.domain.entity.TipoTratamiento;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/**
 * Repositorio del catálogo TipoTratamiento.
 */
@Repository
public interface TipoTratamientoRepository extends JpaRepository<TipoTratamiento, Integer> {

    Optional<TipoTratamiento> findByCodigo(String codigo);
    List<TipoTratamiento> findAllByOrderByNombreAsc();
}
