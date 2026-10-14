package com.clinicaojitos.domain.service;

import com.clinicaojitos.domain.dto.CatalogoDto;
import com.clinicaojitos.domain.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * Expone los catálogos que el frontend necesita para sus desplegables.
 * Son rutas públicas: no contienen información sensible.
 */
@Service
@RequiredArgsConstructor
public class CatalogoService {

    private final TipoConsultaRepository tipoConsultaRepository;
    private final SubespecialidadRepository subespecialidadRepository;
    private final TipoTratamientoRepository tipoTratamientoRepository;
    private final TipoExamenRepository tipoExamenRepository;
    private final TipoSeguroRepository tipoSeguroRepository;
    private final EstadoCitaRepository estadoCitaRepository;
    private final OjoRepository ojoRepository;
    private final DiaSemanaRepository diaSemanaRepository;
    private final EstadoTratamientoRepository estadoTratamientoRepository;
    private final SedeRepository sedeRepository;

    @Transactional(readOnly = true)
    public CatalogoDto.Todos todos() {
        return new CatalogoDto.Todos(
                tipoConsultaRepository.findAllByOrderByNombreAsc().stream().map(this::item).toList(),
                subespecialidadRepository.findAllByOrderByNombreAsc().stream().map(this::item).toList(),
                tipoTratamientoRepository.findAllByOrderByNombreAsc().stream().map(this::item).toList(),
                tipoExamenRepository.findAllByOrderByNombreAsc().stream().map(this::item).toList(),
                tipoSeguroRepository.findAllByOrderByNombreAsc().stream().map(this::item).toList(),
                estadoCitaRepository.findAllByOrderByIdAsc().stream().map(this::item).toList(),
                ojoRepository.findAllByOrderByIdAsc().stream().map(this::item).toList(),
                diaSemanaRepository.findAllByOrderByOrdenAsc().stream().map(this::item).toList(),
                estadoTratamientoRepository.findAllByOrderByIdAsc().stream().map(this::item).toList(),
                sedeRepository.findByActivoTrueOrderByNombreAsc().stream().map(this::item).toList());
    }

    private CatalogoDto.Item item(Object e) {
        if (e instanceof com.clinicaojitos.domain.entity.TipoConsulta t) return new CatalogoDto.Item(t.getId(), t.getCodigo(), t.getNombre());
        if (e instanceof com.clinicaojitos.domain.entity.Subespecialidad t) return new CatalogoDto.Item(t.getId(), t.getCodigo(), t.getNombre());
        if (e instanceof com.clinicaojitos.domain.entity.TipoTratamiento t) return new CatalogoDto.Item(t.getId(), t.getCodigo(), t.getNombre());
        if (e instanceof com.clinicaojitos.domain.entity.TipoExamen t) return new CatalogoDto.Item(t.getId(), t.getCodigo(), t.getNombre());
        if (e instanceof com.clinicaojitos.domain.entity.TipoSeguro t) return new CatalogoDto.Item(t.getId(), null, t.getNombre());
        if (e instanceof com.clinicaojitos.domain.entity.EstadoCita t) return new CatalogoDto.Item(t.getId(), t.getCodigo(), t.getNombre());
        if (e instanceof com.clinicaojitos.domain.entity.Ojo t) return new CatalogoDto.Item(t.getId(), t.getCodigo(), t.getNombre());
        if (e instanceof com.clinicaojitos.domain.entity.DiaSemana t) return new CatalogoDto.Item(t.getId(), t.getCodigo(), t.getNombre());
        if (e instanceof com.clinicaojitos.domain.entity.EstadoTratamiento t) return new CatalogoDto.Item(t.getId(), t.getCodigo(), t.getNombre());
        if (e instanceof com.clinicaojitos.domain.entity.Sede t) return new CatalogoDto.Item(t.getId(), null, t.getNombre());
        return new CatalogoDto.Item(null, null, String.valueOf(e));
    }
}
