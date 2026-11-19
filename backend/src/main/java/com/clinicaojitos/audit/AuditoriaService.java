package com.clinicaojitos.audit;

import com.clinicaojitos.domain.entity.Auditoria;
import com.clinicaojitos.domain.repository.AuditoriaRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.support.TransactionTemplate;

/**
 * Servicio de auditoría (RNF-01).
 *
 * <p>Registra accesos y operaciones sensibles. Cada registro se escribe en su
 * propia transacción y <b>nunca</b> hace fallar la operación de negocio:
 *
 * <ul>
 *   <li>Los textos se recortan al tamaño de su columna. Antes, un User-Agent
 *       largo (Edge mide ~125 caracteres y la columna admite 120) hacía fallar
 *       el INSERT y, con él, el inicio de sesión.</li>
 *   <li>La transacción se abre y se cierra aquí dentro, dentro del try: con
 *       {@code @Transactional} el fallo se convertía en
 *       {@code UnexpectedRollbackException} al salir del método, fuera del
 *       try/catch, y llegaba al login como un error 500.</li>
 * </ul>
 */
@Slf4j
@Service
public class AuditoriaService {

    private final AuditoriaRepository auditoriaRepository;
    private final TransactionTemplate transaccionPropia;

    public AuditoriaService(AuditoriaRepository auditoriaRepository,
                            PlatformTransactionManager transacciones) {
        this.auditoriaRepository = auditoriaRepository;
        this.transaccionPropia = new TransactionTemplate(transacciones);
        this.transaccionPropia.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
    }

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
            Auditoria registro = Auditoria.builder()
                    .username(recortar(username, 60))
                    .accion(recortar(accion, 60))
                    .recurso(recortar(recurso, 60))
                    .recursoId(recursoId)
                    .descripcion(recortar(descripcion, 500))
                    .ipAddress(recortar(ip, 45))
                    .navegador(recortar(navegador, 120))
                    .resultado(recortar(resultado == null ? "EXITOSO" : resultado, 30))
                    .build();
            transaccionPropia.executeWithoutResult(estado -> auditoriaRepository.save(registro));
        } catch (RuntimeException e) {
            log.warn("No se pudo escribir el registro de auditoría ({} {}): {}",
                    accion, recurso, e.getMessage());
        }
    }

    public void registrar(String username, String accion, String recurso,
                          Long recursoId, String descripcion, String resultado) {
        registrar(username, accion, recurso, recursoId, descripcion, null, null, resultado);
    }

    static String recortar(String texto, int maximo) {
        if (texto == null) return null;
        return texto.length() <= maximo ? texto : texto.substring(0, maximo);
    }
}
