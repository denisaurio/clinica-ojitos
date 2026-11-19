package com.clinicaojitos.notificacion;

import com.clinicaojitos.domain.entity.Cita;
import com.clinicaojitos.domain.entity.Oftalmologo;
import com.clinicaojitos.domain.entity.Paciente;
import com.clinicaojitos.domain.entity.Usuario;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.core.task.SyncTaskExecutor;
import org.springframework.mail.MailSendException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;

import java.time.LocalDate;
import java.time.LocalTime;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

/** RF3.5 y RF6.4 — contenido de los correos y envío tolerante a fallos. */
@DisplayName("Notificaciones por correo (RF3.5 · RF6.4)")
class NotificacionServiceTest {

    private final CorreoService correo = mock(CorreoService.class);
    private final NotificacionService servicio =
            new NotificacionService(correo, "https://ojitos.midominio.com/");

    private Cita cita() {
        Paciente p = Paciente.builder().id(1L).nombres("María").apellidos("González")
                .email("maria@correo.com").build();
        Oftalmologo o = Oftalmologo.builder().id(2L).nombres("Elena").apellidos("Rostova").build();
        Cita c = new Cita();
        c.setId(10L);
        c.setPaciente(p);
        c.setOftalmologo(o);
        c.setFecha(LocalDate.of(2026, 12, 3));
        c.setHoraInicio(LocalTime.of(9, 30));
        return c;
    }

    @Test
    @DisplayName("Cita programada: al correo del paciente, con fecha, hora, médico y enlace al portal")
    void programada() {
        servicio.citaProgramada(cita());
        ArgumentCaptor<String> cuerpo = ArgumentCaptor.forClass(String.class);
        verify(correo).enviar(eq("maria@correo.com"), contains("programada"), cuerpo.capture());
        assertThat(cuerpo.getValue()).contains(
                "María", "3 de diciembre de 2026", "09:30", "Elena Rostova", "https://ojitos.midominio.com)");
    }

    @Test
    @DisplayName("Reprogramada y cancelada incluyen el turno anterior y el motivo")
    void reprogramadaYCancelada() {
        servicio.citaReprogramada(cita(), LocalDate.of(2026, 12, 1), LocalTime.of(8, 0));
        verify(correo).enviar(any(), contains("reprogramada"), contains("08:00"));
        servicio.citaCancelada(cita(), "Viaje");
        verify(correo).enviar(any(), contains("cancelada"), contains("Motivo: Viaje"));
    }

    @Test
    @DisplayName("Un fallo al armar o enviar el aviso no rompe la operación de la cita")
    void noRompe() {
        doThrow(new RuntimeException("smtp")).when(correo).enviar(any(), any(), any());
        assertThatCode(() -> servicio.citaProgramada(cita())).doesNotThrowAnyException();
        assertThatCode(() -> servicio.citaProgramada(new Cita())).doesNotThrowAnyException();
    }

    @Test
    @DisplayName("Recuperación: el correo lleva el enlace y la caducidad")
    void recuperacion() {
        Usuario u = Usuario.builder().id(3L).username("dra.rostova").email("elena@clinica.pe").build();
        servicio.enlaceRecuperacion(u, "https://x/restablecer-clave?token=abc", 30);
        verify(correo).enviar(eq("elena@clinica.pe"), contains("Restablecer"),
                contains("https://x/restablecer-clave?token=abc"));
        assertThat(servicio.appUrl()).isEqualTo("https://ojitos.midominio.com");
    }

    @Test
    @DisplayName("Sin SMTP_HOST no se envía nada ni se lanza error")
    @SuppressWarnings("unchecked")
    void sinSmtp() {
        ObjectProvider<JavaMailSender> proveedor = mock(ObjectProvider.class);
        JavaMailSender sender = mock(JavaMailSender.class);
        when(proveedor.getIfAvailable()).thenReturn(sender);
        CorreoService sinHost = new CorreoService(proveedor, new SyncTaskExecutor(), "", "");
        assertThat(sinHost.configurado()).isFalse();
        sinHost.enviar("a@b.com", "x", "y");
        verifyNoInteractions(sender);
    }

    @Test
    @DisplayName("Con SMTP envía; si el servidor falla solo queda en el log")
    @SuppressWarnings("unchecked")
    void conSmtp() {
        ObjectProvider<JavaMailSender> proveedor = mock(ObjectProvider.class);
        JavaMailSender sender = mock(JavaMailSender.class);
        when(proveedor.getIfAvailable()).thenReturn(sender);
        when(proveedor.getObject()).thenReturn(sender);
        CorreoService smtp = new CorreoService(proveedor, new SyncTaskExecutor(),
                "smtp.x.com", "no-responder@x.com");
        smtp.enviar("a@b.com", "Asunto", "Cuerpo");
        verify(sender).send(any(SimpleMailMessage.class));

        doThrow(new MailSendException("caído")).when(sender).send(any(SimpleMailMessage.class));
        assertThatCode(() -> smtp.enviar("a@b.com", "Asunto", "Cuerpo")).doesNotThrowAnyException();
        assertThat(CorreoService.ocultar("maria@correo.com")).isEqualTo("m***@correo.com");
    }
}
