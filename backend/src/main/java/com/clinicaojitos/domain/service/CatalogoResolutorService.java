package com.clinicaojitos.domain.service;

import com.clinicaojitos.domain.entity.Sede;
import com.clinicaojitos.domain.entity.Subespecialidad;
import com.clinicaojitos.domain.repository.SedeRepository;
import com.clinicaojitos.domain.repository.SubespecialidadRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Resuelve —o crea— las entradas de catálogo que escribe el usuario.
 *
 * <p>En el alta de un oftalmólogo la subespecialidad y la sede pueden elegirse
 * del catálogo <em>o escribirse a mano</em>. Si se escribe algo que no está,
 * antes la operación se rechazaba por completo; ahora se da de alta la entrada
 * nueva y el alta continúa.
 *
 * <p>No hace falta tocar el esquema: los catálogos son tablas, no
 * {@code ENUM} de MySQL. Ampliarlos es justamente para lo que existen (RNF-05).
 *
 * <p>La comparación no distingue mayúsculas, acentos ni espacios sobrantes, de
 * modo que «Vitreorretinologia» y «vitreorretinología  » apuntan a la misma
 * entrada.
 */
@Service
@RequiredArgsConstructor
public class CatalogoResolutorService {

    private final SubespecialidadRepository subespecialidadRepository;
    private final SedeRepository sedeRepository;

    /** Normaliza para comparar: minúsculas, sin tildes y sin espacios extra. */
    private String clave(String texto) {
        if (texto == null) return "";
        return java.text.Normalizer.normalize(texto, java.text.Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "")   // quita las tildes
                .trim()
                .replaceAll("\\s+", " ")
                .toLowerCase();
    }

    /**
     * Devuelve la subespecialidad con ese nombre, creándola si no existía.
     * Devuelve {@code null} si el nombre viene vacío.
     */
    @Transactional
    public Subespecialidad subespecialidad(String nombre) {
        if (nombre == null || nombre.isBlank()) {
            return null;
        }

        String limpio = nombre.trim().replaceAll("\\s+", " ");

        Subespecialidad existente = subespecialidadRepository.findAll().stream()
                .filter(s -> clave(s.getNombre()).equals(clave(limpio)))
                .findFirst()
                .orElse(null);

        if (existente != null) {
            return existente;
        }

        // Código legible y único a partir del nombre, p. ej. «Cornea».
        String base = java.text.Normalizer.normalize(limpio, java.text.Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "")
                .toUpperCase()
                .replaceAll("[^A-Z0-9]+", "_")
                .replaceAll("^_|_$", "");
        if (base.isEmpty()) base = "ESPECIALIDAD";
        if (base.length() > 30) base = base.substring(0, 30);

        String codigo = base;
        int sufijo = 2;
        while (subespecialidadRepository.findByCodigo(codigo).isPresent()) {
            codigo = base.substring(0, Math.min(28, base.length())) + "_" + sufijo++;
        }

        return subespecialidadRepository.save(Subespecialidad.builder()
                .codigo(codigo)
                .nombre(limpio)
                .descripcion("Alta desde el registro de profesionales")
                .build());
    }

    /**
     * Devuelve la sede con ese nombre, creándola si no existía.
     * Devuelve {@code null} si el nombre viene vacío.
     */
    @Transactional
    public Sede sede(String nombre) {
        if (nombre == null || nombre.isBlank()) {
            return null;
        }

        String limpio = nombre.trim().replaceAll("\\s+", " ");

        Sede existente = sedeRepository.findAll().stream()
                .filter(s -> clave(s.getNombre()).equals(clave(limpio)))
                .findFirst()
                .orElse(null);

        if (existente != null) {
            return existente;
        }

        return sedeRepository.save(Sede.builder()
                .nombre(limpio)
                .activo(Boolean.TRUE)
                .build());
    }
}