package com.clinicaojitos.domain.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Credenciales de una cuenta recién creada.
 *
 * <p>La contraseña se devuelve <strong>una sola vez</strong>, en la respuesta
 * del alta. No existe ningún endpoint que la vuelva a mostrar: en la base solo
 * queda su hash BCrypt, y un hash no se puede deshacer.
 *
 * <p>Se usa para los dos casos en que el sistema genera una clave: el alta de un
 * oftalmólogo y el alta de un paciente.
 */
public record CredencialesDto(

        String username,
        String password,
        String nombreCompleto,
        String textoParaDescargar
) {

    /**
     * Formato listo para imprimir y entregar.
     */
    public static String formato(String username, String password, String nombre) {
        return """
                ============================================================
                 CREDENCIALES DE ACCESO · CLÍNICA OFTALMOLÓGICA OJITOS
                ============================================================

                 Titular    : %s
                 Usuario    : %s
                 Contraseña : %s

                 Esta contraseña se muestra UNA SOLA VEZ.
                 Entréguesela al titular y pídale que la cambie
                 al iniciar sesión desde Configuración → Mi cuenta.
                ============================================================
                """.formatted(nombre, username, password);
    }
}