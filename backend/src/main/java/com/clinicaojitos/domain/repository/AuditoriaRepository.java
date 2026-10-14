package com.clinicaojitos.domain.repository;

import com.clinicaojitos.domain.entity.Auditoria;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Repositorio de la bitácora de auditoría (RNF-01).
 */
@Repository
public interface AuditoriaRepository extends JpaRepository<Auditoria, Long> {

    /** JPQL: accesos más recientes para el panel del administrador. */
    @Query("""
            SELECT a FROM Auditoria a
            WHERE (:accion IS NULL OR a.accion = :accion)
              AND (:usuarioId IS NULL OR a.usuario.id = :usuarioId)
              AND (:desde IS NULL OR a.fecha >= :desde)
              AND (:hasta IS NULL OR a.fecha <= :hasta)
            ORDER BY a.fecha DESC
            """)
    Page<Auditoria> buscar(@Param("usuarioId") Long usuarioId,
                           @Param("accion") String accion,
                           @Param("desde") LocalDateTime desde,
                           @Param("hasta") LocalDateTime hasta,
                           Pageable pageable);

    List<Auditoria> findTop20ByOrderByFechaDesc();

    /** Trazabilidad de accesos al historial de un paciente (RNF-01). */
    @Query("""
            SELECT a FROM Auditoria a
            WHERE a.recurso = 'CONSULTA'
              AND a.recursoId IN (
                  SELECT c.id FROM Consulta c WHERE c.paciente.id = :pacienteId
              )
            ORDER BY a.fecha DESC
            """)
    List<Auditoria> accesosAlHistorial(@Param("pacienteId") Long pacienteId);

    long countByAccionAndFechaBetween(String accion, LocalDateTime desde, LocalDateTime hasta);
}
