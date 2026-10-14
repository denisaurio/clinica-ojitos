package com.clinicaojitos.audit;

import com.clinicaojitos.domain.entity.Auditoria;
import com.clinicaojitos.domain.repository.AuditoriaRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

/**
 * Servicio de auditoría (RNF-01).
 *
 * <p>Registra accesos y operaciones sensibles. Las escrituras corren en una
 * transacción independiente para que un fallo en la auditoría nunca revierta
 * la operación de negocio que ya se ejecutó.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AuditoriaService {

    private final AuditoriaRepository auditoriaRepository;

    @Async
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void registrar(
            String username,
            String accion,
            String recurso,
            Long recursoId,
            String descripcion,
            String ip,
            String navegador,
            String resultado) {

        try {
            auditoriaRepository.save(Auditoria.builder()
                    .username(username)
                    .accion(accion)
                    .recurso(recurso)
                    .recursoId(recursoId)
                    .descripcion(descripcion)
                    .ipAddress(ip)
                    .navegador(navegador)
                    .resultado(resultado)
                    .build());
        } catch (Exception e) {
            log.warn("No se pudo escribir el registro de auditoría: {}", e.getMessage());
        }
    }

    public void registrar(String username, String accion, String recurso,
                          Long recursoId, String descripcion, String resultado) {
        registrar(username, accion, recurso, recursoId, descripcion, null, null, resultado);
    }
}
