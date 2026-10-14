package com.clinicaojitos.domain.repository;

import com.clinicaojitos.domain.entity.DiaSemana;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/**
 * Repositorio del catálogo DiaSemana.
 */
@Repository
public interface DiaSemanaRepository extends JpaRepository<DiaSemana, Integer> {

    Optional<DiaSemana> findByCodigo(String codigo);
    List<DiaSemana> findAllByOrderByOrdenAsc();
}
