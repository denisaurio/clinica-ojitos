package com.clinicaojitos.notificacion;

import com.clinicaojitos.domain.entity.Cita;
import com.clinicaojitos.domain.entity.Usuario;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.Locale;

/**
 * Textos de los correos que envía el sistema.
 *
 * <ul>
 *   <li>RF3.5 — avisos al paciente cuando su cita se programa, reprograma o cancela.</li>
 *   <li>RF6.4 — enlace para restablecer la contraseña.</li>
 * </ul>
 *
 * <p>Los datos se leen aquí, dentro de la transacción del llamador; el envío
 * real lo hace {@link CorreoService} después del commit.
 */
@Slf4j
@Service
public class NotificacionService {

    private static final String CLINICA = "Clínica Oftalmológica Ojitos";
    private static final Locale ES = Locale.forLanguageTag("es-PE");
    private static final DateTimeFormatter FECHA =
            DateTimeFormatter.ofPattern("EEEE d 'de' MMMM 'de' yyyy", ES);
    private static final DateTimeFormatter HORA = DateTimeFormatter.ofPattern("HH:mm");

    private final CorreoService correo;
    private final String appUrl;

    public NotificacionService(CorreoService correo, @Value("${app.url:}") String appUrl) {
        this.correo = correo;
        this.appUrl = quitarBarraFinal(appUrl);
    }

    /** Dirección pública de la web (APP_URL), sin barra final. */
    public String appUrl() {
        return appUrl;
    }

    // ------------------------------------------------------------------ RF3.5

    public void citaProgramada(Cita c) {
        avisarCita(c, "Su cita ha sido programada",
                "Le confirmamos su cita:", null);
    }

    public void citaReprogramada(Cita c, LocalDate fechaAnterior, LocalTime horaAnterior) {
        String antes = fechaAnterior == null ? null
                : "Antes: " + fecha(fechaAnterior) + " a las " + hora(horaAnterior) + ".";
        avisarCita(c, "Su cita ha sido reprogramada",
                "Su cita cambió de fecha u hora. Los nuevos datos son:", antes);
    }

    public void citaCancelada(Cita c, String motivo) {
        String extra = motivo == null || motivo.isBlank() ? null : "Motivo: " + motivo.trim();
        avisarCita(c, "Su cita ha sido cancelada",
                "Le informamos que se canceló la siguiente cita:", extra);
    }

    private void avisarCita(Cita c, String asunto, String intro, String extra) {
        try {
            if (c == null || c.getPaciente() == null) return;
            var p = c.getPaciente();
            StringBuilder t = new StringBuilder();
            t.append("Hola ").append(nvl(p.getNombres(), "")).append(",\n\n")
             .append(intro).append("\n\n")
             .append("  Fecha:        ").append(fecha(c.getFecha())).append('\n')
             .append("  Hora:         ").append(hora(c.getHoraInicio())).append('\n');
            if (c.getOftalmologo() != null) {
                t.append("  Especialista: ").append(c.getOftalmologo().getNombreCompleto()).append('\n');
            }
            if (c.getTipoConsulta() != null) {
                t.append("  Consulta:     ").append(c.getTipoConsulta().getNombre()).append('\n');
            }
            if (c.getSede() != null) {
                t.append("  Sede:         ").append(c.getSede().getNombre())
                 .append(c.getConsultorio() == null ? "" : " · " + c.getConsultorio()).append('\n');
            }
            if (extra != null) t.append('\n').append(extra).append('\n');
            t.append("\nSi no puede asistir, puede reprogramar o cancelar desde su portal");
            if (!appUrl.isEmpty()) t.append(" (").append(appUrl).append(')');
            t.append(" o llamando a la clínica.\n");
            correo.enviar(p.getEmail(), asunto + " · " + CLINICA, firmar(t));
        } catch (RuntimeException e) {
            // Un aviso nunca debe deshacer la operación sobre la cita.
            log.warn("No se pudo preparar el aviso de la cita {}: {}", c == null ? null : c.getId(), e.getMessage());
        }
    }

    // ------------------------------------------------------------------ RF6.4

    /** Envía el enlace de recuperación; {@code enlace} ya incluye el token. */
    public void enlaceRecuperacion(Usuario u, String enlace, long minutos) {
        StringBuilder t = new StringBuilder();
        t.append("Hola ").append(u.getUsername()).append(",\n\n")
         .append("Recibimos una solicitud para restablecer la contraseña de su cuenta.\n")
         .append("Abra este enlace para elegir una nueva (vence en ").append(minutos).append(" minutos):\n\n")
         .append("  ").append(enlace).append("\n\n")
         .append("Si usted no lo pidió, ignore este mensaje: su contraseña actual sigue igual.\n");
        correo.enviar(u.getEmail(), "Restablecer contraseña · " + CLINICA, firmar(t));
    }

    // ------------------------------------------------------------------ util

    private static String firmar(StringBuilder t) {
        return t.append("\n--\n").append(CLINICA)
                .append("\nEste es un mensaje automático; no responda a este correo.\n")
                .toString();
    }

    private static String fecha(LocalDate f) {
        if (f == null) return "—";
        String s = f.format(FECHA);
        return Character.toUpperCase(s.charAt(0)) + s.substring(1);
    }

    private static String hora(LocalTime h) {
        return h == null ? "—" : h.format(HORA);
    }

    private static String nvl(String s, String porDefecto) {
        return s == null ? porDefecto : s;
    }

    private static String quitarBarraFinal(String url) {
        if (url == null) return "";
        String u = url.trim();
        while (u.endsWith("/")) u = u.substring(0, u.length() - 1);
        return u;
    }
}
