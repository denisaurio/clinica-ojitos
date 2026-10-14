package com.clinicaojitos.domain.service;

import com.clinicaojitos.domain.dto.*;
import com.clinicaojitos.domain.entity.*;
import com.clinicaojitos.domain.repository.ExamenRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * Traduce entidades JPA a DTOs de la API.
 *
 * <p>Centraliza la conversión para que ninguna entidad escape a la capa HTTP.
 * Los datos sensibles —como {@code passwordHash}— nunca se copian a un DTO.
 */
@Component
@RequiredArgsConstructor
public class Mapeador {

    private final ExamenRepository examenRepository;

    // ----------------------------- Usuarios -----------------------------

    public AuthDto.PerfilResponse aPerfil(Usuario u) {
        return new AuthDto.PerfilResponse(
                u.getId(),
                u.getUsername(),
                nombreDeCuenta(u),
                u.getEmail(),
                u.getCodigoRol(),
                Boolean.TRUE.equals(u.getActivo()),
                u.getUltimoAcceso());
    }

    private String nombreDeCuenta(Usuario u) {
        return u.getRol() != null ? u.getRol().getNombre() : u.getUsername();
    }

    // ----------------------------- Pacientes ----------------------------

    public PacienteDto.Response aPaciente(Paciente p) {
        return new PacienteDto.Response(
                p.getId(),
                p.getNombres(),
                p.getApellidos(),
                p.getNombreCompleto(),
                p.getIniciales(),
                p.getDocumento(),
                p.getFechaNacimiento(),
                p.getEdad(),
                p.getTelefono(),
                p.getEmail(),
                p.getDireccion(),
                p.getTipoSeguro() != null ? p.getTipoSeguro().getId() : null,
                p.getTipoSeguro() != null ? p.getTipoSeguro().getNombre() : null,
                p.getGrupoSanguineo(),
                p.getFotoUrl(),
                p.getHistorialOcular(),
                p.getAlergias(),
                Boolean.TRUE.equals(p.getActivo()),
                p.getFechaRegistro());
    }

    public PacienteDto.Resumen aResumen(Paciente p) {
        return new PacienteDto.Resumen(
                p.getId(),
                p.getNombreCompleto(),
                p.getIniciales(),
                p.getDocumento(),
                p.getEdad(),
                p.getTelefono(),
                p.getEmail(),
                p.getTipoSeguro() != null ? p.getTipoSeguro().getNombre() : "Particular",
                Boolean.TRUE.equals(p.getActivo()));
    }

    // --------------------------- Oftalmólogos ---------------------------

    public OftalmologoDto.Response aOftalmologo(Oftalmologo o) {
        return new OftalmologoDto.Response(
                o.getId(),
                o.getNombres(),
                o.getApellidos(),
                o.getNombreCompleto(),
                o.getIniciales(),
                o.getEmail(),
                o.getTelefono(),
                o.getNumeroColegiatura(),
                o.getSubespecialidad() != null ? o.getSubespecialidad().getId() : null,
                o.getSubespecialidad() != null ? o.getSubespecialidad().getNombre() : null,
                o.getSede() != null ? o.getSede().getId() : null,
                o.getSede() != null ? o.getSede().getNombre() : null,
                o.getFotoUrl(),
                Boolean.TRUE.equals(o.getActivo()),
                o.getFechaIngreso());
    }

    public OftalmologoDto.HorarioResponse aHorario(HorarioLaboral h) {
        return new OftalmologoDto.HorarioResponse(
                h.getId(),
                h.getDiaSemana() != null ? h.getDiaSemana().getId() : null,
                h.getDiaSemana() != null ? h.getDiaSemana().getNombre() : null,
                h.getDiaSemana() != null ? h.getDiaSemana().getOrden() : null,
                h.getHoraInicio(),
                h.getHoraFin(),
                h.getTipoBloque() != null ? h.getTipoBloque().getId() : null,
                h.getTipoBloque() != null ? h.getTipoBloque().getNombre() : null,
                h.getSede() != null ? h.getSede().getId() : null,
                h.getSede() != null ? h.getSede().getNombre() : null,
                Boolean.TRUE.equals(h.getActivo()));
    }

    // ------------------------------ Citas -------------------------------

    public CitaDto.Response aCita(Cita c) {
        return new CitaDto.Response(
                c.getId(),
                c.getPaciente() != null ? c.getPaciente().getId() : null,
                c.getPaciente() != null ? c.getPaciente().getNombreCompleto() : null,
                c.getPaciente() != null ? c.getPaciente().getDocumento() : null,
                c.getOftalmologo() != null ? c.getOftalmologo().getId() : null,
                c.getOftalmologo() != null ? c.getOftalmologo().getNombreCompleto() : null,
                c.getOftalmologo() != null && c.getOftalmologo().getSubespecialidad() != null
                        ? c.getOftalmologo().getSubespecialidad().getNombre() : null,
                c.getSede() != null ? c.getSede().getId() : null,
                c.getSede() != null ? c.getSede().getNombre() : null,
                c.getConsultorio(),
                c.getFecha(),
                c.getHoraInicio(),
                c.getHoraFin(),
                c.getTipoConsulta() != null ? c.getTipoConsulta().getId() : null,
                c.getTipoConsulta() != null ? c.getTipoConsulta().getNombre() : null,
                c.getEstado(),
                c.getEstadoCita() != null ? c.getEstadoCita().getNombre() : null,
                c.getMotivo(),
                c.getNotaInterna(),
                c.ocupaAgenda(),
                c.getFechaCreacion());
    }

    public CitaDto.AgendaDia aAgendaDia(Cita c) {
        return new CitaDto.AgendaDia(
                c.getId(),
                c.getHoraInicio(),
                c.getHoraFin(),
                c.getPaciente() != null ? c.getPaciente().getNombreCompleto() : null,
                c.getPaciente() != null ? c.getPaciente().getDocumento() : null,
                c.getMotivo(),
                c.getEstado(),
                c.getEstadoCita() != null ? c.getEstadoCita().getNombre() : null,
                c.getConsultorio(),
                c.getTipoConsulta() != null ? c.getTipoConsulta().getNombre() : null);
    }

    public CitaDto.Evento aEvento(Cita c) {
        return new CitaDto.Evento(
                c.getId(),
                c.getFecha(),
                c.getHoraInicio(),
                c.getHoraFin(),
                c.getPaciente() != null ? c.getPaciente().getId() : null,
                c.getPaciente() != null ? c.getPaciente().getNombreCompleto() : null,
                c.getTipoConsulta() != null ? c.getTipoConsulta().getNombre() : "Consulta",
                c.getEstado(),
                c.getConsultorio());
    }

    // ---------------------------- Historial -----------------------------

    public ConsultaDto.Response aConsulta(Consulta c) {
        long adjuntos = c.getId() == null ? 0 : examenRepository.countByConsultaId(c.getId());
        return new ConsultaDto.Response(
                c.getId(),
                c.getPaciente() != null ? c.getPaciente().getId() : null,
                c.getPaciente() != null ? c.getPaciente().getNombreCompleto() : null,
                c.getPaciente() != null ? c.getPaciente().getDocumento() : null,
                c.getOftalmologo() != null ? c.getOftalmologo().getId() : null,
                c.getOftalmologo() != null ? c.getOftalmologo().getNombreCompleto() : null,
                c.getOftalmologo() != null && c.getOftalmologo().getSubespecialidad() != null
                        ? c.getOftalmologo().getSubespecialidad().getNombre() : null,
                c.getFecha(),
                c.getTipoConsulta() != null ? c.getTipoConsulta().getId() : null,
                c.getTipoConsulta() != null ? c.getTipoConsulta().getNombre() : null,
                c.getAgudezaOd(),
                c.getAgudezaOi(),
                decimal(c.getPioOd()),
                decimal(c.getPioOi()),
                c.getPupilas(),
                c.getBiomicroscopia(),
                c.getFondoOjo(),
                c.getDiagnostico(),
                c.getCie10(),
                c.getSoapSubjetivo(),
                c.getSoapObjetivo(),
                c.getSoapEvaluacion(),
                c.getSoapPlan(),
                c.getObservaciones(),
                (int) adjuntos);
    }

    public ConsultaDto.Evolución aEvolucion(Consulta c) {
        return new ConsultaDto.Evolución(
                c.getFecha(), decimal(c.getPioOd()), decimal(c.getPioOi()),
                c.getAgudezaOd(), c.getAgudezaOi(), c.getDiagnostico());
    }

    public ConsultaDto.ExamenResponse aExamen(Examen e) {
        return new ConsultaDto.ExamenResponse(
                e.getId(),
                e.getConsulta() != null ? e.getConsulta().getId() : null,
                e.getTipoExamen() != null ? e.getTipoExamen().getId() : null,
                e.getTipoExamen() != null ? e.getTipoExamen().getNombre() : null,
                e.getArchivoUrl(),
                e.getNombreArchivo(),
                e.getMimeType(),
                e.getDescripcion(),
                e.getFecha());
    }

    // --------------------------- Tratamientos ---------------------------

    public TratamientoDto.Response aTratamiento(Tratamiento t) {
        return new TratamientoDto.Response(
                t.getId(),
                t.getPaciente() != null ? t.getPaciente().getId() : null,
                t.getPaciente() != null ? t.getPaciente().getNombreCompleto() : null,
                t.getOftalmologo() != null ? t.getOftalmologo().getId() : null,
                t.getOftalmologo() != null ? t.getOftalmologo().getNombreCompleto() : null,
                t.getConsulta() != null ? t.getConsulta().getId() : null,
                t.getTipo() != null ? t.getTipo().getId() : null,
                t.getTipo() != null ? t.getTipo().getNombre() : null,
                t.getEstado() != null ? t.getEstado().getId() : null,
                t.getEstado() != null ? t.getEstado().getNombre() : null,
                t.getMedicamento(),
                t.getPrincipioActivo(),
                t.getDosis(),
                t.getOjo() != null ? t.getOjo().getId() : null,
                t.getOjo() != null ? t.getOjo().getNombre() : null,
                t.getFrecuencia(),
                t.getDuracion(),
                t.getCirugia() != null ? t.getCirugia().getId() : null,
                t.getFechaInicio(),
                t.getFechaFin(),
                t.getFechaControl(),
                t.getIndicaciones(),
                Boolean.TRUE.equals(t.getActivo()));
    }

    public TratamientoDto.ControlResponse aControl(ControlTratamiento c) {
        return new TratamientoDto.ControlResponse(
                c.getId(),
                c.getTratamiento() != null ? c.getTratamiento().getId() : null,
                c.getOftalmologo() != null ? c.getOftalmologo().getId() : null,
                c.getOftalmologo() != null ? c.getOftalmologo().getNombreCompleto() : null,
                c.getFecha(),
                c.getResultado(),
                decimal(c.getPioOd()),
                decimal(c.getPioOi()),
                c.getObservaciones());
    }

    public TratamientoDto.CirugiaResponse aCirugia(Cirugia s) {
        return new TratamientoDto.CirugiaResponse(
                s.getId(),
                s.getPaciente() != null ? s.getPaciente().getId() : null,
                s.getPaciente() != null ? s.getPaciente().getNombreCompleto() : null,
                s.getOftalmologo() != null ? s.getOftalmologo().getId() : null,
                s.getOftalmologo() != null ? s.getOftalmologo().getNombreCompleto() : null,
                s.getDiagnosticoPreop(),
                s.getTipoCirugia(),
                s.getOjo() != null ? s.getOjo().getId() : null,
                s.getOjo() != null ? s.getOjo().getNombre() : null,
                s.getFechaProgramada(),
                s.getFechaRealizada(),
                s.getAnestesia(),
                s.getTecnica(),
                s.getIncidencias(),
                s.getLenteIntraocular(),
                s.getEstado());
    }

    /**
     * Convierte el DECIMAL de la base al número que viaja en la API.
     * La presión intraocular se almacena como decimal exacto (mmHg con dos
     * decimales); la API expone un número simple.
     */
    private Double decimal(java.math.BigDecimal valor) {
        return valor == null ? null : valor.doubleValue();
    }
}