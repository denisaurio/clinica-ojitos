package com.clinicaojitos.integracion;

import com.clinicaojitos.domain.entity.Paciente;
import com.clinicaojitos.domain.repository.PacienteRepository;
import com.clinicaojitos.security.CifradoCampos;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * RNF-01 — en la base, los textos clínicos quedan cifrados; la aplicación los
 * sigue leyendo en claro. Se comprueba leyendo la columna cruda con SQL.
 */
@DisplayName("Persistencia cifrada de textos clínicos (RNF-01)")
class CifradoPersistenciaTest extends BaseIntegracionTest {

    @Autowired private PacienteRepository pacientes;
    @Autowired private JdbcTemplate jdbc;

    @Test
    @DisplayName("Las alergias se guardan cifradas y se leen en claro")
    void alergiasCifradas() {
        Paciente p = pacientes.save(Paciente.builder()
                .nombres("Prueba").apellidos("Cifrado").documento("CIF-0001")
                .alergias("Alergia a la penicilina").historialOcular("Cirugía refractiva 2019").build());

        String crudo = jdbc.queryForObject("SELECT alergias FROM paciente WHERE id = ?", String.class, p.getId());
        assertThat(crudo).startsWith(CifradoCampos.PREFIJO).doesNotContain("penicilina");

        Paciente leido = pacientes.findById(p.getId()).orElseThrow();
        assertThat(leido.getAlergias()).isEqualTo("Alergia a la penicilina");
        assertThat(leido.getHistorialOcular()).isEqualTo("Cirugía refractiva 2019");
    }
}
