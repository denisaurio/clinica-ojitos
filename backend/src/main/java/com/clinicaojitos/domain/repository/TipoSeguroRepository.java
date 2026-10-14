package com.clinicaojitos.domain.repository;

import com.clinicaojitos.domain.entity.TipoSeguro;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/**
 * Repositorio del catálogo TipoSeguro.
 */
@Repository
public interface TipoSeguroRepository extends JpaRepository<TipoSeguro, Integer> {

    List<TipoSeguro> findAllByOrderByNombreAsc();
}
