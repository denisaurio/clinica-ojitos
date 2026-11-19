package com.clinicaojitos.relaciones;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.lang.reflect.Field;
import java.lang.reflect.Modifier;
import java.util.Arrays;
import java.util.Map;
import java.util.Set;
import java.util.TreeSet;
import java.util.stream.Collectors;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * RELACIONES entre módulos.
 *
 * <p>Fija qué servicio depende de qué otro servicio. Si alguien añade una
 * dependencia nueva (o rompe una existente) este test se pone en rojo y dice
 * exactamente qué relación cambió. Mantener sincronizado con
 * {@code testing/modulos.json}, que es lo que dibuja el reporte.
 */
@DisplayName("Mapa de dependencias entre módulos")
class MapaDependenciasTest {

    private static final String PAQUETE = "com.clinicaojitos.domain.service.";

    private static final Map<String, Set<String>> ESPERADO = Map.of(
            "AuthService", Set.of("JwtService", "AuditoriaService", "RegistroAccesoService"),
            "AutorizacionPacienteService", Set.of(),
            "CatalogoResolutorService", Set.of(),
            "CatalogoService", Set.of(),
            "CitaService", Set.of("PacienteService", "AutorizacionPacienteService"),
            "ConsultaService", Set.of("AuthService", "AutorizacionPacienteService"),
            "DashboardService", Set.of("PacienteService", "CitaService", "ConsultaService",
                    "TratamientoService", "AuthService"),
            "OftalmologoService", Set.of("CatalogoResolutorService"),
            "PacienteService", Set.of("AutorizacionPacienteService"),
            "TratamientoService", Set.of("AuthService", "AutorizacionPacienteService"));

    @Test
    @DisplayName("Cada servicio depende exactamente de los servicios declarados")
    void dependenciasDeclaradas() throws Exception {
        for (var entrada : ESPERADO.entrySet()) {
            Class<?> clase = Class.forName(PAQUETE + entrada.getKey());
            Set<String> reales = Arrays.stream(clase.getDeclaredFields())
                    .filter(f -> !Modifier.isStatic(f.getModifiers()))
                    .map(Field::getType)
                    .map(Class::getSimpleName)
                    .filter(n -> n.endsWith("Service"))
                    .collect(Collectors.toCollection(TreeSet::new));

            assertThat(reales)
                    .as("Dependencias de servicio de %s", entrada.getKey())
                    .containsExactlyInAnyOrderElementsOf(entrada.getValue());
        }
    }

    @Test
    @DisplayName("No hay dependencias circulares entre servicios")
    void sinCiclos() {
        for (String origen : ESPERADO.keySet()) {
            assertThat(alcanzables(origen, new TreeSet<>()))
                    .as("%s no debe depender de sí mismo, ni directa ni indirectamente", origen)
                    .doesNotContain(origen);
        }
    }

    private Set<String> alcanzables(String nodo, Set<String> visitados) {
        for (String hijo : ESPERADO.getOrDefault(nodo, Set.of())) {
            if (visitados.add(hijo)) {
                alcanzables(hijo, visitados);
            }
        }
        return visitados;
    }
}
