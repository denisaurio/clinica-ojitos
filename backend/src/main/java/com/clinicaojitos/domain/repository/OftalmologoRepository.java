package com.clinicaojitos.domain.repository;

import com.clinicaojitos.domain.entity.Oftalmologo;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/**
 * Repositorio de oftalmólogos (RF-05).
 */
@Repository
public interface OftalmologoRepository extends JpaRepository<Oftalmologo, Long> {

    /** RF5.2 — unicidad de la colegiatura. */
    boolean existsByNumeroColegiatura(String numeroColegiatura);

    boolean existsByEmailIgnoreCase(String email);

    Optional<Oftalmologo> findByEmailIgnoreCase(String email);

    @Query("""
            SELECT o FROM Oftalmologo o
            LEFT JOIN FETCH o.subespecialidad
            LEFT JOIN FETCH o.sede
            WHERE (:activo IS NULL OR o.activo = :activo)
              AND (
                :buscar IS NULL
                OR LOWER(o.nombres)           LIKE LOWER(CONCAT('%', :buscar, '%'))
                OR LOWER(o.apellidos)         LIKE LOWER(CONCAT('%', :buscar, '%'))
                OR o.numeroColegiatura        LIKE CONCAT('%', :buscar, '%')
                OR LOWER(o.subespecialidad.nombre) LIKE LOWER(CONCAT('%', :buscar, '%'))
              )
            """)
    Page<Oftalmologo> buscar(@Param("buscar") String buscar,
                             @Param("activo") Boolean activo,
                             Pageable pageable);

    List<Oftalmologo> findByActivoTrueOrderByApellidosAsc();

    @Query("""
            SELECT o FROM Oftalmologo o
            JOIN FETCH o.subespecialidad
            WHERE o.activo = true
            ORDER BY o.apellidos, o.nombres
            """)
    List<Oftalmologo> listarActivosConSubespecialidad();

    long countByActivoTrue();
}
