package com.clinicaojitos.domain.repository;

import com.clinicaojitos.domain.entity.TipoConsulta;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/**
 * Repositorio del catálogo TipoConsulta.
 */
@Repository
public interface TipoConsultaRepository extends JpaRepository<TipoConsulta, Integer> {

    Optional<TipoConsulta> findByCodigo(String codigo);
    List<TipoConsulta> findAllByOrderByNombreAsc();
}
