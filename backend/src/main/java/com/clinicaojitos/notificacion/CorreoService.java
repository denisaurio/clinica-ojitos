package com.clinicaojitos.notificacion;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.task.TaskExecutor;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

/**
 * Envío de correos por SMTP (RF3.5 y RF6.4).
 *
 * <p>Reglas:
 * <ul>
 *   <li>Nunca hace fallar la operación que lo pide: un SMTP caído o mal
 *       configurado solo deja un aviso en el log.</li>
 *   <li>Si se llama dentro de una transacción, envía <b>después del commit</b>:
 *       no se avisa de una cita que al final no se guardó.</li>
 *   <li>Envía en segundo plano para no alargar la respuesta HTTP.</li>
 *   <li>Sin {@code SMTP_HOST} no envía nada (desarrollo local y pruebas).</li>
 * </ul>
 */
@Slf4j
@Service
public class CorreoService {

    private final ObjectProvider<JavaMailSender> mailSender;
    private final TaskExecutor ejecutor;
    private final String host;
    private final String remitente;

    public CorreoService(ObjectProvider<JavaMailSender> mailSender,
                         TaskExecutor ejecutor,
                         @Value("${spring.mail.host:}") String host,
                         @Value("${app.correo.remitente:}") String remitente) {
        this.mailSender = mailSender;
        this.ejecutor = ejecutor;
        this.host = host == null ? "" : host.trim();
        this.remitente = remitente == null ? "" : remitente.trim();
        if (this.host.isEmpty()) {
            log.warn("SMTP_HOST no está definido: los avisos de citas y la recuperación de "
                    + "contraseña no enviarán correos.");
        }
    }

    /** {@code true} si hay servidor SMTP configurado. */
    public boolean configurado() {
        return !host.isEmpty() && mailSender.getIfAvailable() != null;
    }

    /** Programa el envío; nunca lanza excepciones. */
    public void enviar(String para, String asunto, String cuerpo) {
        if (para == null || para.isBlank()) {
            log.debug("Correo «{}» omitido: el destinatario no tiene email.", asunto);
            return;
        }
        if (!configurado()) {
            log.info("Correo «{}» para {} omitido: SMTP no configurado.", asunto, ocultar(para));
            return;
        }
        Runnable tarea = () -> ejecutor.execute(() -> enviarAhora(para.trim(), asunto, cuerpo));
        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    tarea.run();
                }
            });
        } else {
            tarea.run();
        }
    }

    private void enviarAhora(String para, String asunto, String cuerpo) {
        try {
            SimpleMailMessage m = new SimpleMailMessage();
            if (!remitente.isEmpty()) m.setFrom(remitente);
            m.setTo(para);
            m.setSubject(asunto);
            m.setText(cuerpo);
            mailSender.getObject().send(m);
            log.info("Correo «{}» enviado a {}.", asunto, ocultar(para));
        } catch (RuntimeException e) {
            log.warn("No se pudo enviar el correo «{}» a {}: {}", asunto, ocultar(para), e.getMessage());
        }
    }

    /** m***@dominio.com: el log no guarda direcciones completas de pacientes. */
    static String ocultar(String email) {
        int arroba = email.indexOf('@');
        if (arroba <= 1) return "***" + (arroba >= 0 ? email.substring(arroba) : "");
        return email.charAt(0) + "***" + email.substring(arroba);
    }
}
