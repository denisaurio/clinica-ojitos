package com.clinicaojitos.domain.repository;

import com.clinicaojitos.domain.entity.Subespecialidad;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/**
 * Repositorio del catálogo Subespecialidad.
 */
@Repository
public interface SubespecialidadRepository extends JpaRepository<Subespecialidad, Integer> {

    Optional<Subespecialidad> findByCodigo(String codigo);
    List<Subespecialidad> findAllByOrderByNombreAsc();
}
