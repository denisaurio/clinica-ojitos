package com.clinicaojitos.config;

import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.ApplicationEvent;
import org.springframework.context.ApplicationListener;
import org.springframework.core.env.ConfigurableEnvironment;

import java.util.Arrays;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Resumen de la configuración recibida al arrancar (RNF-04).
 *
 * <p>Si el arranque falla, {@code main()} lo imprime como ÚLTIMAS líneas del log: Coolify
 * muestra solo las 100 últimas y el stacktrace tapa el inicio, así que sin
 * esto no se ve si las variables de entorno llegaron al contenedor.
 *
 * <p>Nunca imprime secretos: de las claves solo dice si están definidas.
 * El fallo lo imprime {@code main()} para que funcione aunque el contexto de
 * Spring no llegue a crearse.
 */
public class DiagnosticoArranque implements ApplicationListener<ApplicationEvent> {

    private static final Pattern JDBC = Pattern.compile("jdbc:mysql://([^/:?]+)(?::(\\d+))?/([^?]*)");

    private static final String[] SECRETOS = {"DB_PASSWORD", "JWT_SECRET", "ADMIN_PASSWORD"};
    private static final String[] VISIBLES = {"SPRING_PROFILES_ACTIVE", "DB_USER", "CORS_ALLOWED_ORIGINS", "ADMIN_USERNAME"};

    @Override
    public void onApplicationEvent(ApplicationEvent evento) {
        // El fallo se imprime desde main(), después del stacktrace de Spring.
        if (evento instanceof ApplicationReadyEvent listo) {
            System.out.println(resumen("ARRANQUE CORRECTO", listo.getApplicationContext().getEnvironment(), null));
        }
    }

    public static String resumen(String titulo, ConfigurableEnvironment env, Throwable error) {
        Map<String, String> filas = new LinkedHashMap<>();
        if (env != null) {
            filas.put("Perfiles activos", Arrays.toString(
                    env.getActiveProfiles().length > 0 ? env.getActiveProfiles() : env.getDefaultProfiles()));
        }

        String url = System.getenv("DB_URL");
        filas.put("DB_URL", url == null || url.isBlank()
                ? "NO DEFINIDA -> se usa localhost:3306 (la variable no llegó al contenedor)"
                : describirJdbc(url));
        for (String clave : VISIBLES) {
            String valor = System.getenv(clave);
            filas.put(clave, valor == null || valor.isBlank() ? "NO DEFINIDA" : valor);
        }
        for (String clave : SECRETOS) {
            String valor = System.getenv(clave);
            filas.put(clave, valor == null || valor.isBlank() ? "NO DEFINIDA" : "definida (" + valor.length() + " caracteres)");
        }

        StringBuilder sb = new StringBuilder("\n================ DIAGNÓSTICO: ").append(titulo).append(" ================\n");
        filas.forEach((k, v) -> sb.append(String.format("  %-24s %s%n", k, v)));
        if (error != null) {
            sb.append("  Causa raíz              ").append(causaRaiz(error)).append('\n');
        }
        sb.append("==================================================================\n");
        return sb.toString();
    }

    static String describirJdbc(String url) {
        Matcher m = JDBC.matcher(url);
        if (!m.find()) return "formato no reconocido (debe empezar por jdbc:mysql://host:puerto/base)";
        return "host=" + m.group(1) + " puerto=" + (m.group(2) == null ? "3306" : m.group(2)) + " base=" + m.group(3);
    }

    static String causaRaiz(Throwable error) {
        Throwable raiz = error;
        while (raiz.getCause() != null && raiz.getCause() != raiz) raiz = raiz.getCause();
        String mensaje = raiz.getMessage() == null ? "" : raiz.getMessage().split("\n")[0];
        return raiz.getClass().getSimpleName() + ": " + mensaje;
    }
}
