-- =============================================================================
--  CLÍNICA OFTALMOLÓGICA OJITOS  ·  Consultas de evidencia
--  Fase 5 — JPQL y operaciones CRUD sobre la base de datos
--
--  Este archivo documenta las consultas que respaldan las afirmaciones del
--  informe. Son consultas SQL equivalentes a los métodos @Query (JPQL)
--  implementados en el backend, para que la evidencia de la fase 5 pueda
--  reproducirse directamente en el cliente MySQL.
--
--  Cada bloque indica:
--    · la capa del backend responsable
--    · el endpoint HTTP que lo expone
--    · el requisito funcional asociado
-- =============================================================================

USE clinica_ojitos;
SET NAMES utf8mb4;

-- =============================================================================
--  RF-01 · PACIENTES
-- =============================================================================

-- [1.1] Listado paginado con búsqueda parcial por nombre o documento.
--       Servicio: PacienteService.buscar()   ·  GET /api/v1/pacientes?buscar=&page=&size=
SELECT p.id, p.nombres, p.apellidos, p.documento, p.edad, p.telefono,
       ts.nombre AS seguro
FROM paciente p
LEFT JOIN tipo_seguro ts ON ts.id = p.tipo_seguro_id
WHERE p.activo = 1
  AND ( :buscar IS NULL
        OR p.documento LIKE CONCAT('%', :buscar, '%')
        OR CONCAT(p.nombres, ' ', p.apellidos) LIKE CONCAT('%', :buscar, '%') )
ORDER BY p.apellidos, p.nombres
LIMIT :size OFFSET :offset;

-- [1.2] Verificación en tiempo real de duplicidad de documento (RF1.2).
--       Se usa desde el formulario de alta del prototipo (pantalla 3.6.2).
SELECT COUNT(*) AS documento_ya_registrado
FROM paciente
WHERE documento = :documento;

-- [1.3] Ficha completa con sus antecedentes clínicos (pantalla 3.6.3).
SELECT p.*, ts.nombre AS seguro,
       (SELECT COUNT(*) FROM consulta    c  WHERE c.paciente_id  = p.id) AS total_consultas,
       (SELECT COUNT(*) FROM cita        ct WHERE ct.paciente_id = p.id AND ct.bloqueo = 1) AS total_citas,
       (SELECT COUNT(*) FROM tratamiento t  WHERE t.paciente_id  = p.id AND t.activo = 1)   AS tratamientos_activos
FROM paciente p
LEFT JOIN tipo_seguro ts ON ts.id = p.tipo_seguro_id
WHERE p.id = :id;

-- =============================================================================
--  RF-02 · HISTORIAL MÉDICO
-- =============================================================================

-- [2.1] Evolución cronológica del paciente (pantalla 3.6.5).
--       Servicio: ConsultaService.listarPorPaciente()  ·  GET /api/v1/historiales/paciente/{id}
SELECT co.id, co.fecha, tc.nombre AS tipo,
       CONCAT(o.nombres, ' ', o.apellidos) AS oftalmologo,
       co.agudeza_od, co.agudeza_oi, co.pio_od, co.pio_oi,
       co.diagnostico,
       (SELECT COUNT(*) FROM examen e WHERE e.consulta_id = co.id) AS adjuntos
FROM consulta co
INNER JOIN oftalmologo   o  ON o.id  = co.oftalmologo_id
INNER JOIN tipo_consulta tc ON tc.id = co.tipo_consulta_id
WHERE co.paciente_id = :pacienteId
ORDER BY co.fecha DESC
LIMIT :size OFFSET :offset;

-- [2.2] Serie temporal de presión intraocular para la gráfica de evolución
--       (pantalla 3.6.4).
--       Servicio: ConsultaService.evolucionPio()  ·  GET /api/v1/historiales/{id}/evolucion
SELECT fecha, pio_od, pio_oi, agudeza_od, agudeza_oi, diagnostico
FROM v_evolucion_presion_intraocular
WHERE paciente_id = :pacienteId
ORDER BY fecha;

-- [2.3] Diagnósticos vigentes del paciente para el portal (pantalla 3.6.24).
SELECT DISTINCT diagnostico,
       MAX(fecha) AS ultima_actualizacion
FROM consulta
WHERE paciente_id = :pacienteId
GROUP BY diagnostico
ORDER BY ultima_actualizacion DESC;

-- =============================================================================
--  RF-03 · CITAS
-- =============================================================================

-- [3.1] Agenda diaria de un oftalmólogo (RNF-03, caché de la agenda diaria).
--       Servicio: CitaService.agendaDiaria()  ·  GET /api/v1/citas/agenda?oftalmologoId=&fecha=
SELECT c.id AS cita_id, c.hora_inicio, c.hora_fin, c.consultorio,
       CONCAT(p.nombres, ' ', p.apellidos) AS paciente,
       p.documento,
       ec.nombre AS estado, tc.nombre AS tipo, c.motivo
FROM cita c
INNER JOIN paciente      p  ON p.id  = c.paciente_id
INNER JOIN estado_cita   ec ON ec.id = c.estado_cita_id
LEFT  JOIN tipo_consulta tc ON tc.id = c.tipo_consulta_id
WHERE c.oftalmologo_id = :oftalmologoId
  AND c.fecha = :fecha
  AND c.bloqueo = 1
  AND ec.codigo <> 'CANCELADA'
ORDER BY c.hora_inicio;

-- [3.2] REGLA DE NEGOCIO RF3.2 — control de cruce de horario.
--       Devuelve 1 si el horario ya está ocupado y, por tanto, la cita debe
--       rechazarse con HTTP 409 CruceDeHorarioException.
--       Servicio: CitaService.existeSolape()  ·  POST /api/v1/citas
SELECT COUNT(*) AS horario_ocupado
FROM cita
WHERE oftalmologo_id = :oftalmologoId
  AND fecha         = :fecha
  AND hora_inicio   = :horaInicio
  AND bloqueo       = 1
  AND estado_cita_id <> (SELECT id FROM estado_cita WHERE codigo = 'CANCELADA')
  AND id <> :idExcluido;

-- [3.3] Franjas horarias disponibles de un profesional para una fecha concreta.
--       Alimenta la grilla BOOKED / FREE del prototipo (pantalla 3.6.9).
SELECT h.hora_inicio, h.hora_fin, tb.nombre AS tipo_bloque,
       CASE WHEN EXISTS (
              SELECT 1 FROM cita c
              WHERE c.oftalmologo_id = h.oftalmologo_id
                AND c.fecha         = :fecha
                AND c.hora_inicio   = h.hora_inicio
                AND c.bloqueo       = 1
         ) THEN 'BOOKED' ELSE 'FREE' END AS estado
FROM horario_laboral h
INNER JOIN dia_semana        ds ON ds.id = h.dia_semana_id
INNER JOIN tipo_bloque_horario tb ON tb.id = h.tipo_bloque_id
WHERE h.oftalmologo_id = :oftalmologoId
  AND ds.codigo = :diaSemana
  AND h.activo = 1
ORDER BY h.hora_inicio;

-- [3.4] Citas reprogramables / estadísticas de la agenda.
SELECT estado, COUNT(*) AS total,
       ROUND(AVG(TIMESTAMPDIFF(MINUTE, hora_inicio, hora_fin)), 0) AS duracion_prom_min
FROM cita
WHERE fecha BETWEEN :desde AND :hasta
GROUP BY estado
ORDER BY total DESC;

-- =============================================================================
--  RF-04 · TRATAMIENTOS Y SEGUIMIENTO
-- =============================================================================

-- [4.1] Plan terapéutico vigente del paciente (pantalla 3.6.11).
--       Servicio: TratamientoService.listarPorPaciente()  ·  GET /api/v1/tratamientos/paciente/{id}
SELECT t.id, tt.nombre AS tipo, t.medicamento, t.principio_activo,
       t.dosis, o.nombre AS ojo, t.frecuencia, t.duracion,
       t.fecha_inicio, t.fecha_fin, t.fecha_control, et.nombre AS estado, t.indicaciones,
       CONCAT(m.nombres, ' ', m.apellidos) AS oftalmologo
FROM tratamiento t
INNER JOIN tipo_tratamiento    tt ON tt.id = t.tipo_id
INNER JOIN estado_tratamiento   et ON et.id = t.estado_id
LEFT  JOIN ojo                   o  ON o.id  = t.ojo
INNER JOIN oftalmologo          m  ON m.id  = t.oftalmologo_id
WHERE t.paciente_id = :pacienteId
ORDER BY t.activo DESC, t.fecha_inicio DESC;

-- [4.2] Controles del tratamiento a lo largo del tiempo (pantalla 3.6.12).
SELECT ct.fecha, ct.resultado, ct.pio_od, ct.pio_oi, ct.observaciones,
       CONCAT(o.nombres, ' ', o.apellidos) AS oftalmologo
FROM control_tratamiento ct
LEFT JOIN oftalmologo o ON o.id = ct.oftalmologo_id
WHERE ct.tratamiento_id = :tratamientoId
ORDER BY ct.fecha DESC;

-- [4.3] Registrar seguimiento (PATCH /api/v1/tratamientos/{id}/seguimiento).
INSERT INTO control_tratamiento (tratamiento_id, oftalmologo_id, fecha, resultado, pio_od, pio_oi, observaciones)
VALUES (:tratamientoId, :oftalmologoId, :fecha, :resultado, :pioOd, :pioOi, :observaciones);

-- =============================================================================
--  RF-05 · MÉDICOS Y HORARIOS
-- =============================================================================

-- [5.1] REGLA DE NEGOCIO RF5.2 — unicidad de la colegiatura.
--       Servicio: OftalmologoService.existeColegiatura()  ·  POST /api/v1/oftalmologos
SELECT COUNT(*) AS colegiatura_ya_registrada
FROM oftalmologo
WHERE numero_colegiatura = :numeroColegiatura;

-- [5.2] Directorio de médicos con estado operativo (pantalla 3.6.15).
SELECT o.id, CONCAT(o.nombres, ' ', o.apellidos) AS nombre,
       o.email, o.numero_colegiatura,
       s.nombre AS subespecialidad,
       CASE WHEN o.activo = 1 THEN 'ACTIVO' ELSE 'INACTIVO' END AS estado,
       (SELECT COUNT(*) FROM cita c WHERE c.oftalmologo_id = o.id AND c.bloqueo = 1) AS citas_asignadas
FROM oftalmologo o
INNER JOIN subespecialidad s ON s.id = o.subespecialidad_id
WHERE (:buscar IS NULL
       OR CONCAT(o.nombres, ' ', o.apellidos) LIKE CONCAT('%', :buscar, '%')
       OR o.numero_colegiatura LIKE CONCAT('%', :buscar, '%')
       OR s.nombre LIKE CONCAT('%', :buscar, '%'))
ORDER BY o.activo DESC, o.apellidos;

-- [5.3] Matriz de disponibilidad semanal (pantalla 3.6.17).
SELECT ds.nombre AS dia, ds.orden,
       h.hora_inicio, h.hora_fin, tb.nombre AS tipo
FROM horario_laboral h
INNER JOIN dia_semana          ds ON ds.id = h.dia_semana_id
INNER JOIN tipo_bloque_horario tb ON tb.id = h.tipo_bloque_id
WHERE h.oftalmologo_id = :oftalmologoId AND h.activo = 1
ORDER BY ds.orden, h.hora_inicio;

-- [5.4] Métricas de carga asistencial del especialista (pantalla 3.6.18).
SELECT
  (SELECT COUNT(DISTINCT c.paciente_id)
     FROM cita c
    WHERE c.oftalmologo_id = :oftalmologoId AND c.bloqueo = 1)          AS pacientes_atendidos,
  (SELECT COUNT(*)
     FROM cita c
    WHERE c.oftalmologo_id = :oftalmologoId
      AND c.fecha = CURDATE() AND c.bloqueo = 1)                        AS carga_semanal,
  (SELECT COUNT(*)
     FROM horario_laboral h
     JOIN dia_semana d ON d.id = h.dia_semana_id
    WHERE h.oftalmologo_id = :oftalmologoId AND h.activo = 1
      AND d.codigo <> 'DOM'
      AND h.tipo_bloque_id <> (SELECT id FROM tipo_bloque_horario WHERE codigo = 'DESCANSO'))
    AS horas_semanales;

-- =============================================================================
--  RNF-01 · AUDITORÍA
-- =============================================================================

-- [6.1] Registro de accesos reciente del panel de administrador (pantalla 3.6.21).
--       Servicio: AuditoriaService.listarRecientes()  ·  GET /api/v1/admin/auditoria
SELECT a.fecha, a.username, a.ip_address, a.accion, a.recurso,
       a.descripcion, a.resultado
FROM auditoria a
WHERE (:usuarioId IS NULL OR a.usuario_id = :usuarioId)
ORDER BY a.fecha DESC
LIMIT :limit;

-- [6.2] Trazabilidad de accesos al historial clínico de un paciente (RNF-01).
SELECT a.fecha, a.username, a.accion, a.descripcion, a.ip_address
FROM auditoria a
WHERE a.recurso = 'CONSULTA'
  AND a.recurso_id IN (SELECT id FROM consulta WHERE paciente_id = :pacienteId)
ORDER BY a.fecha DESC;

-- =============================================================================
--  PRUEBAS CRUD (evidencia de la fase 5)
--  Ejecutar en bloque para demostrar CREATE / READ / UPDATE / DELETE.
-- =============================================================================

-- ---- CREATE ---------------------------------------------------------------
INSERT INTO paciente (nombres, apellidos, documento, telefono, email, edad, activo)
VALUES ('Prueba', 'CRUD', 'TEST-CRUD-001', '999 888 777', 'prueba@clinicaojitos.pe', 30, 1);
SET @id_prueba = LAST_INSERT_ID();

-- ---- READ -----------------------------------------------------------------
SELECT * FROM paciente WHERE id = @id_prueba;

-- ---- UPDATE ---------------------------------------------------------------
UPDATE paciente
SET telefono = '900 000 000', email = 'actualizado@clinicaojitos.pe'
WHERE id = @id_prueba;
SELECT id, nombres, telefono, email FROM paciente WHERE id = @id_prueba;

-- ---- DELETE ---------------------------------------------------------------
DELETE FROM paciente WHERE id = @id_prueba;
SELECT COUNT(*) AS debe_ser_0 FROM paciente WHERE id = @id_prueba;

-- =============================================================================
--  FIN DE LAS CONSULTAS DE EVIDENCIA
-- =============================================================================