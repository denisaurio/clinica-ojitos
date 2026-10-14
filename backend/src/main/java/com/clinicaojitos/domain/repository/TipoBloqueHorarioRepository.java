package com.clinicaojitos.domain.repository;

import com.clinicaojitos.domain.entity.TipoBloqueHorario;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/**
 * Repositorio del catálogo TipoBloqueHorario.
 */
@Repository
public interface TipoBloqueHorarioRepository extends JpaRepository<TipoBloqueHorario, Integer> {

    Optional<TipoBloqueHorario> findByCodigo(String codigo);
}
