package com.clinicaojitos.config;

import com.clinicaojitos.domain.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.ApplicationArguments;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * Verifica al arrancar que los catálogos estén poblados.
 *
 * <p>Los datos se cargan con los scripts de `sql/`, no desde la aplicación:
 * mantenerlos en la base permite versionarlos y revisarlos.
 * Este runner solo avisa por consola si falta alguno, para que el diagnóstico
 * de un arranque fallido sea inmediato.
 */
@Slf4j
@Order(1)
@Component
@RequiredArgsConstructor
public class DatosIniciales implements ApplicationRunner {

    private final RolRepository rolRepository;
    private final EstadoCitaRepository estadoCitaRepository;
    private final TipoConsultaRepository tipoConsultaRepository;
    private final SubespecialidadRepository subespecialidadRepository;

    @Override
    @Transactional(readOnly = true)
    public void run(ApplicationArguments args) {
        var avisos = new java.util.ArrayList<String>();

        if (rolRepository.count() == 0) avisos.add("rol");
        if (estadoCitaRepository.count() == 0) avisos.add("estado_cita");
        if (tipoConsultaRepository.count() == 0) avisos.add("tipo_consulta");
        if (subespecialidadRepository.count() == 0) avisos.add("subespecialidad");

        if (avisos.isEmpty()) {
            log.info("Catálogos verificados. La base de datos está lista.");
        } else {
            log.warn("Faltan catálogos: {}. Ejecuta sql/01_esquema.sql y sql/02_datos_prueba.sql",
                    String.join(", ", avisos));
        }
    }
}
