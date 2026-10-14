package com.clinicaojitos.domain.dto;

import java.util.List;

/**
 * Payloads de los catálogos que consume el frontend para llenar los
 * desplegables del prototipo (tipos de consulta, subespecialidades, seguros...).
 */
public final class CatalogoDto {

    private CatalogoDto() {
    }

    /** Elemento genérico de catálogo. */
    public record Item(Integer id, String codigo, String nombre) {
    }

    /** Lista completa de catálogos. */
    public record Todos(
            List<Item> tiposConsulta,
            List<Item> subespecialidades,
            List<Item> tiposTratamiento,
            List<Item> tiposExamen,
            List<Item> seguros,
            List<Item> estadosCita,
            List<Item> ojos,
            List<Item> diasSemana,
            List<Item> estadosTratamiento,
            List<Item> sedes
    ) {
    }

    /** Respuesta simple para verificar existencia (documento, colegiatura). */
    public record Existe(boolean existe) {
    }
}
