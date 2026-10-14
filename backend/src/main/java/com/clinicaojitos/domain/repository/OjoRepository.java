package com.clinicaojitos.domain.repository;

import com.clinicaojitos.domain.entity.Ojo;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/**
 * Repositorio del catálogo Ojo.
 */
@Repository
public interface OjoRepository extends JpaRepository<Ojo, Integer> {

    Optional<Ojo> findByCodigo(String codigo);
    List<Ojo> findAllByOrderByIdAsc();
}
