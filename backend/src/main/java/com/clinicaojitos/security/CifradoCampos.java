package com.clinicaojitos.security;

import javax.crypto.Cipher;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.security.SecureRandom;
import java.util.Base64;

/**
 * Cifrado de campos clínicos en reposo (RNF-01, Ley N.º 29733).
 *
 * <p>AES-256 en modo GCM: cada valor lleva un IV aleatorio de 12 bytes y una
 * etiqueta de autenticación de 128 bits, así que dos textos iguales nunca se
 * guardan igual y cualquier alteración del valor cifrado se detecta al leerlo.
 *
 * <p>Formato guardado: {@code enc:v1:<base64(iv || cifrado)>}. El prefijo
 * permite convivir con los datos antiguos en texto plano: lo que no empieza
 * por él se devuelve tal cual y se cifra la próxima vez que se guarde.
 */
public final class CifradoCampos {

    public static final String PREFIJO = "enc:v1:";
    private static final int IV_BYTES = 12;
    private static final int TAG_BITS = 128;
    private static final SecureRandom ALEATORIO = new SecureRandom();

    private final SecretKeySpec clave;

    /**
     * @param claveBase64 32 bytes en Base64 ({@code openssl rand -base64 32});
     *                    vacía = sin cifrado (solo desarrollo local).
     */
    public CifradoCampos(String claveBase64) {
        if (claveBase64 == null || claveBase64.isBlank()) {
            this.clave = null;
            return;
        }
        byte[] bytes;
        try {
            bytes = Base64.getDecoder().decode(claveBase64.trim());
        } catch (IllegalArgumentException e) {
            throw new IllegalStateException("DATA_ENCRYPTION_KEY no es Base64 válido.", e);
        }
        if (bytes.length != 32) {
            throw new IllegalStateException(
                    "DATA_ENCRYPTION_KEY debe tener 32 bytes (AES-256); tiene " + bytes.length
                            + ". Genérela con: openssl rand -base64 32");
        }
        this.clave = new SecretKeySpec(bytes, "AES");
    }

    public boolean activo() {
        return clave != null;
    }

    public String cifrar(String texto) {
        if (texto == null || clave == null || texto.startsWith(PREFIJO)) {
            return texto;
        }
        try {
            byte[] iv = new byte[IV_BYTES];
            ALEATORIO.nextBytes(iv);
            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.ENCRYPT_MODE, clave, new GCMParameterSpec(TAG_BITS, iv));
            byte[] cifrado = cipher.doFinal(texto.getBytes(StandardCharsets.UTF_8));
            byte[] juntos = ByteBuffer.allocate(iv.length + cifrado.length).put(iv).put(cifrado).array();
            return PREFIJO + Base64.getEncoder().encodeToString(juntos);
        } catch (GeneralSecurityException e) {
            throw new IllegalStateException("No se pudo cifrar el campo clínico.", e);
        }
    }

    public String descifrar(String guardado) {
        if (guardado == null || !guardado.startsWith(PREFIJO)) {
            return guardado; // dato antiguo en texto plano
        }
        if (clave == null) {
            throw new IllegalStateException(
                    "Hay datos clínicos cifrados y falta DATA_ENCRYPTION_KEY para leerlos.");
        }
        try {
            byte[] juntos = Base64.getDecoder().decode(guardado.substring(PREFIJO.length()));
            ByteBuffer buffer = ByteBuffer.wrap(juntos);
            byte[] iv = new byte[IV_BYTES];
            buffer.get(iv);
            byte[] cifrado = new byte[buffer.remaining()];
            buffer.get(cifrado);
            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.DECRYPT_MODE, clave, new GCMParameterSpec(TAG_BITS, iv));
            return new String(cipher.doFinal(cifrado), StandardCharsets.UTF_8);
        } catch (GeneralSecurityException | IllegalArgumentException e) {
            throw new IllegalStateException(
                    "No se pudo descifrar un campo clínico: la clave no coincide o el dato fue alterado.", e);
        }
    }
}
