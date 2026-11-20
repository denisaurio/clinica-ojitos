package com.clinicaojitos.security;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * Convierte de forma transparente los textos clínicos al guardarlos y leerlos
 * (RNF-01). Se aplica con {@code @Convert(converter = CampoClinicoConverter.class)}
 * sobre cada campo; el resto del código trabaja con texto plano.
 *
 * <p>Es un bean de Spring para recibir {@code DATA_ENCRYPTION_KEY}: Spring Boot
 * entrega a Hibernate los converters desde su contenedor.
 */
@Slf4j
@Component
@Converter
public class CampoClinicoConverter implements AttributeConverter<String, String> {

    private final CifradoCampos cifrado;

    public CampoClinicoConverter(@Value("${app.cifrado.clave:}") String clave) {
        this.cifrado = new CifradoCampos(clave);
        if (!cifrado.activo()) {
            log.warn("DATA_ENCRYPTION_KEY no está definida: los textos clínicos se guardan sin cifrar. "
                    + "Defínala en producción (openssl rand -base64 32).");
        }
    }

    @Override
    public String convertToDatabaseColumn(String texto) {
        return cifrado.cifrar(texto);
    }

    @Override
    public String convertToEntityAttribute(String guardado) {
        return cifrado.descifrar(guardado);
    }
}
