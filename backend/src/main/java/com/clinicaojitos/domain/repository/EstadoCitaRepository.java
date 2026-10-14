package com.clinicaojitos.domain.repository;

import com.clinicaojitos.domain.entity.EstadoCita;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/**
 * Repositorio del catálogo EstadoCita.
 */
@Repository
public interface EstadoCitaRepository extends JpaRepository<EstadoCita, Integer> {

    Optional<EstadoCita> findByCodigo(String codigo);
    List<EstadoCita> findAllByOrderByIdAsc();
}
