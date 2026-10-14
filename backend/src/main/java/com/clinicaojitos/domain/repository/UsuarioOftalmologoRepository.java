package com.clinicaojitos.domain.repository;

import com.clinicaojitos.domain.entity.UsuarioOftalmologo;
import com.clinicaojitos.domain.entity.UsuarioOftalmologoId;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

/**
 * Repositorio del vínculo usuario <-> oftalmólogo.
 */
@Repository
public interface UsuarioOftalmologoRepository extends JpaRepository<UsuarioOftalmologo, UsuarioOftalmologoId> {

    Optional<UsuarioOftalmologo> findByOftalmologoId(Long oftalmologoId);

    Optional<UsuarioOftalmologo> findByUsuarioId(Long usuarioId);

    boolean existsByOftalmologoId(Long oftalmologoId);
}
