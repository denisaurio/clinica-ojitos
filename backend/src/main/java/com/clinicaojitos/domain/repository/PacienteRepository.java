package com.clinicaojitos.domain.repository;

import com.clinicaojitos.domain.entity.Paciente;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

/**
 * Repositorio de pacientes (RF-01).
 */
@Repository
public interface PacienteRepository extends JpaRepository<Paciente, Long> {

    /** RF1.2 — validación en tiempo real desde el formulario de alta. */
    boolean existsByDocumento(String documento);

    Optional<Paciente> findByDocumento(String documento);

    Optional<Paciente> findByEmailIgnoreCase(String email);

    /**
     * JPQL: búsqueda parcial por nombre, apellido o documento.
     * Es la consulta que alimenta el buscador del listado de pacientes.
     */
    @Query("""
            SELECT p FROM Paciente p
            LEFT JOIN FETCH p.tipoSeguro
            WHERE p.activo = true
              AND (
                :buscar IS NULL
                OR LOWER(p.nombres)    LIKE LOWER(CONCAT('%', :buscar, '%'))
                OR LOWER(p.apellidos)  LIKE LOWER(CONCAT('%', :buscar, '%'))
                OR p.documento        LIKE CONCAT('%', :buscar, '%')
              )
            """)
    Page<Paciente> buscar(@Param("buscar") String buscar, Pageable pageable);

    long countByActivoTrue();

    /** Paciente asociado a la cuenta de acceso de un usuario (rol PACIENTE). */
    @Query("""
            SELECT p FROM Paciente p
            WHERE LOWER(p.email) = LOWER(:email)
            """)
    Optional<Paciente> findByEmailParaAcceso(@Param("email") String email);
}
