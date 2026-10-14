package com.clinicaojitos.domain.repository;

import com.clinicaojitos.domain.entity.TipoExamen;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/**
 * Repositorio del catálogo TipoExamen.
 */
@Repository
public interface TipoExamenRepository extends JpaRepository<TipoExamen, Integer> {

    Optional<TipoExamen> findByCodigo(String codigo);
    List<TipoExamen> findAllByOrderByNombreAsc();
}
