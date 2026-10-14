package com.clinicaojitos.domain.repository;

import com.clinicaojitos.domain.entity.HorarioLaboral;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * Repositorio de la matriz de disponibilidad semanal (RF-05.4).
 */
@Repository
public interface HorarioLaboralRepository extends JpaRepository<HorarioLaboral, Integer> {

    List<HorarioLaboral> findByOftalmologoIdOrderByDiaSemanaIdAscHoraInicioAsc(Long oftalmologoId);

    List<HorarioLaboral> findByOftalmologoIdAndActivoTrue(Long oftalmologoId);

    void deleteByOftalmologoId(Long oftalmologoId);
}
