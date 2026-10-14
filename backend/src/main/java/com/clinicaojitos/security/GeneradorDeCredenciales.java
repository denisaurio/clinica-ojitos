package com.clinicaojitos.security;

import org.springframework.stereotype.Component;

import java.security.SecureRandom;

/**
 * Genera contraseñas aleatorias para las cuentas de acceso de los profesionales.
 *
 * <p>Cada oftalmólogo recibe una contraseña distinta e impredecible. El
 * administrador se la ve <strong>una sola vez</strong>, en el momento del alta,
 * y puede descargarla como credencial para entregársela al profesional, que
 * deberá cambiarla en su primer acceso.
 *
 * <p>No se usan palabras ni patrones predecibles: la contraseña se compone de
 * mayúsculas, minúsculas, dígitos y símbolos elegidos al azar. Está en el
 * conjunto imprimible para poder transcribirla sin errores.
 */
@Component
public class GeneradorDeCredenciales {

    private static final String CONJUNTO =
            "ABCDEFGHJKLMNPQRSTUVWXYZ"   // sin I ni O: se confunden con 1 y 0
            + "abcdefghijkmnopqrstuvwxyz"  // sin l
            + "23456789";                   // sin 0 ni 1

    private static final String SIMBOLOS = "!@#$%&*?";

    private final SecureRandom aleatorio = new SecureRandom();

    /**
     * Crea una contraseña de 12 caracteres: mezcla de letras, dígitos y al menos
     * un símbolo, para que no se parezca a una palabra y no entre en las
     * listas de contraseñas típicas que se atacan primero.
     */
    public String nuevaPassword() {
        StringBuilder clave = new StringBuilder(12);

        clave.append(aleatorio.nextInt(2) == 0 ? 'A' : 'a');
        clave.append(aleatorio.nextInt(2) == 0 ? 'A' : 'a');
        clave.append((char) ('0' + aleatorio.nextInt(10)));
        clave.append(SIMBOLOS.charAt(aleatorio.nextInt(SIMBOLOS.length())));

        while (clave.length() < 12) {
            clave.append(CONJUNTO.charAt(aleatorio.nextInt(CONJUNTO.length())));
        }

        // Baraja para que los caracteres no queden en un orden fijo.
        char[] caracteres = clave.toString().toCharArray();
        for (int i = caracteres.length - 1; i > 0; i--) {
            int j = aleatorio.nextInt(i + 1);
            char tmp = caracteres[i];
            caracteres[i] = caracteres[j];
            caracteres[j] = tmp;
        }
        return new String(caracteres);
    }

    /**
     * Formatea la credencial como un bloque listo para imprimir y entregar.
     */
    public String comoCredencial(String username, String password, String nombre) {
        return """
                ============================================================
                 CREDENCIALES DE ACCESO · CLÍNICA OFTALMOLÓGICA OJITOS
                ============================================================

                 Profesional : %s
                 Usuario     : %s
                 Contraseña  : %s

                 Esta contraseña se muestra UNA SOLA VEZ.
                 Entréguesela al profesional y pídale que la cambie
                 al iniciar sesión desde Configuración → Mi cuenta.
                ============================================================
                """.formatted(nombre, username, password);
    }
}