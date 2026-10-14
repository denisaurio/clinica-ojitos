package com.clinicaojitos.domain.repository;

import com.clinicaojitos.domain.entity.Sede;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/**
 * Repositorio del catálogo Sede.
 */
@Repository
public interface SedeRepository extends JpaRepository<Sede, Integer> {

    List<Sede> findByActivoTrueOrderByNombreAsc();
}
