package com.clinicaojitos.domain.repository;

import com.clinicaojitos.domain.entity.Usuario;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

/**
 * Repositorio de usuarios (RF-06).
 */
@Repository
public interface UsuarioRepository extends JpaRepository<Usuario, Long> {

    Optional<Usuario> findByUsernameIgnoreCase(String username);

    boolean existsByUsernameIgnoreCase(String username);

    Optional<Usuario> findByEmailIgnoreCase(String email);

    /** JPQL: recupera el usuario junto con su rol y su ficha de oftalmólogo. */
    @Query("""
            SELECT u FROM Usuario u
            LEFT JOIN FETCH u.rol
            WHERE LOWER(u.username) = LOWER(:username)
            """)
    Optional<Usuario> buscarPorUsernameConRol(@Param("username") String username);

    /** JPQL: Ophthalmologists that still have no linked account. */
    @Query("""
            SELECT u FROM Usuario u
            JOIN FETCH u.rol r
            WHERE r.codigo = :rol AND u.activo = true
            ORDER BY u.username
            """)
    java.util.List<Usuario> listarPorRol(@Param("rol") String rol);
}
