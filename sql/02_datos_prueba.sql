-- =============================================================================
--  CLÍNICA OFTALMOLÓGICA OJITOS  ·  Datos de prueba
--  Fase 5 — Integración con Base de Datos
--
--  Requisito previo:  01_esquema.sql  debe haberse ejecutado antes.
--
--  ⚠️  SEGURIDAD (RNF-01)
--  Todos los usuarios de prueba usan la contraseña:  Ojitos2026*
--  Los hashes son BCrypt. ESTOS DATOS SON EXCLUSIVAMENTE DE DESARROLLO LOCAL.
--  Antes de cualquier despliegue, cambie la contraseña de cada cuenta.
--
--  El script es idempotente: puede ejecutarse más de una vez.
-- =============================================================================

USE clinica_ojitos;

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- -----------------------------------------------------------------------------
--  USUARIOS (RF-06) — 4 roles
--
--  password_hash = BCrypt("Ojitos2026*"), verificado con
--  BCryptPasswordEncoder.matches(). Las cuentas se crean aquí y solo aquí.
--  La cuenta "admin" / "admin123" se crea en 04_cuentas_iniciales.sql.
-- -----------------------------------------------------------------------------
DELETE FROM usuario_oftalmologo;
DELETE FROM auditoria;
DELETE FROM usuario;

INSERT INTO usuario (id, username, password_hash, email, rol_id, activo, fecha_creacion) VALUES
  (1, 'admin',      '$2a$10$A0dcDmz59HQ2Gj7DsWNp/.lhQ8h.cA/biTvsKk8dB0jO.hqq7pqDW', 'admin@clinicaojitos.pe',      1, 1, NOW()),
  (2, 'dra.rostova','$2a$10$A0dcDmz59HQ2Gj7DsWNp/.lhQ8h.cA/biTvsKk8dB0jO.hqq7pqDW', 'e.rostova@clinicaojitos.pe', 2, 1, NOW()),
  (3, 'dra.torres',  '$2a$10$A0dcDmz59HQ2Gj7DsWNp/.lhQ8h.cA/biTvsKk8dB0jO.hqq7pqDW', 'c.torres@clinicaojitos.pe',  2, 1, NOW()),
  (4, 'dr.mendoza',  '$2a$10$A0dcDmz59HQ2Gj7DsWNp/.lhQ8h.cA/biTvsKk8dB0jO.hqq7pqDW', 'c.mendoza@clinicaojitos.pe', 2, 1, NOW()),
  (5, 'recepcion',   '$2a$10$A0dcDmz59HQ2Gj7DsWNp/.lhQ8h.cA/biTvsKk8dB0jO.hqq7pqDW', 'recepcion@clinicaojitos.pe',  3, 1, NOW()),
  (6, 'paciente',    '$2a$10$A0dcDmz59HQ2Gj7DsWNp/.lhQ8h.cA/biTvsKk8dB0jO.hqq7pqDW', 'maria.gonzalez@email.com',   4, 1, NOW());

-- -----------------------------------------------------------------------------
--  SEDES
-- -----------------------------------------------------------------------------
SET @sede_central = (SELECT id FROM sede WHERE nombre = 'Sede Central - Ojitos');

-- -----------------------------------------------------------------------------
--  OFTALMÓLOGOS (RF-05) — datos tomados del prototipo de alta fidelidad
-- -----------------------------------------------------------------------------
DELETE FROM horario_laboral;
DELETE FROM usuario_oftalmologo;
DELETE FROM oftalmologo;

SET @sub_retina   = (SELECT id FROM subespecialidad WHERE codigo = 'RETINA');
SET @sub_glaucoma = (SELECT id FROM subespecialidad WHERE codigo = 'GLAUCOMA');
SET @sub_cornea   = (SELECT id FROM subespecialidad WHERE codigo = 'CORNEA');
SET @sub_catarata = (SELECT id FROM subespecialidad WHERE codigo = 'CATARATA');

INSERT INTO oftalmologo
  (id, nombres, apellidos, email, telefono, numero_colegiatura, subespecialidad_id, sede_id, activo, fecha_ingreso) VALUES
  (1, 'Elena',  'Rostova',   'e.rostova@clinicaojitos.pe', '987 654 321', 'COP-38472',  @sub_glaucoma, @sede_central, 1, '2021-03-15'),
  (2, 'Carlos', 'Mendoza',   'c.mendoza@clinicaojitos.pe', '987 112 445', 'COP-41003',  @sub_retina,   @sede_central, 1, '2022-07-01'),
  (3, 'Carmen', 'Torres',    'c.torres@clinicaojitos.pe',  '956 774 233', 'COP-52918',  @sub_cornea,   @sede_central, 1, '2020-01-20'),
  (4, 'Luis',   'Fernández', 'l.fernandez@clinicaojitos.pe','933 220 118','COP-30117', @sub_catarata, @sede_central, 1, '2019-11-05'),
  (5, 'Ana',    'Quispe',    'a.quispe@clinicaojitos.pe',  '944 887 003', 'COP-61230',  @sub_glaucoma, @sede_central, 0, '2023-02-10');

INSERT INTO usuario_oftalmologo (usuario_id, oftalmologo_id) VALUES
  (2, 1), (3, 3), (4, 2);

-- -----------------------------------------------------------------------------
--  HORARIOS DE ATENCIÓN (RF-05.4)
--  LUN a VIE 08:00-13:00 consulta · 15:00-17:00 cirugía · 13:00-15:00 pausa
-- -----------------------------------------------------------------------------
SET @d_lun = (SELECT id FROM dia_semana WHERE codigo = 'LUN');
SET @d_mar = (SELECT id FROM dia_semana WHERE codigo = 'MAR');
SET @d_mie = (SELECT id FROM dia_semana WHERE codigo = 'MIE');
SET @d_jue = (SELECT id FROM dia_semana WHERE codigo = 'JUE');
SET @d_vie = (SELECT id FROM dia_semana WHERE codigo = 'VIE');
SET @d_sab = (SELECT id FROM dia_semana WHERE codigo = 'SAB');
SET @b_cons  = (SELECT id FROM tipo_bloque_horario WHERE codigo = 'CONSULTA');
SET @b_cirug = (SELECT id FROM tipo_bloque_horario WHERE codigo = 'CIRUGIA');
SET @b_desc  = (SELECT id FROM tipo_bloque_horario WHERE codigo = 'DESCANSO');

INSERT INTO horario_laboral (oftalmologo_id, dia_semana_id, hora_inicio, hora_fin, tipo_bloque_id, sede_id) VALUES
  -- Dra. Rostova (Glaucoma) — lunes a viernes
  (1, @d_lun, '08:00', '13:00', @b_cons,  @sede_central),
  (1, @d_lun, '13:00', '15:00', @b_desc,  @sede_central),
  (1, @d_lun, '15:00', '17:00', @b_cirug, @sede_central),
  (1, @d_mar, '08:00', '13:00', @b_cons,  @sede_central),
  (1, @d_mie, '08:00', '13:00', @b_cons,  @sede_central),
  (1, @d_jue, '08:00', '13:00', @b_cons,  @sede_central),
  (1, @d_jue, '15:00', '17:00', @b_cirug, @sede_central),
  (1, @d_vie, '09:00', '13:00', @b_cons,  @sede_central),
  -- Dr. Mendoza (Retina) — lunes, miércoles, viernes
  (2, @d_lun, '08:00', '12:00', @b_cons,  @sede_central),
  (2, @d_mie, '08:00', '12:00', @b_cons,  @sede_central),
  (2, @d_mie, '15:00', '17:00', @b_cirug, @sede_central),
  (2, @d_vie, '08:00', '12:00', @b_cons,  @sede_central),
  -- Dra. Torres (Córnea) — martes a sábado
  (3, @d_mar, '09:00', '14:00', @b_cons,  @sede_central),
  (3, @d_mie, '09:00', '14:00', @b_cons,  @sede_central),
  (3, @d_jue, '09:00', '14:00', @b_cons,  @sede_central),
  (3, @d_vie, '09:00', '14:00', @b_cons,  @sede_central),
  (3, @d_sab, '09:00', '13:00', @b_cons,  @sede_central),
  -- Dr. Fernández (Catarata) — lunes a jueves
  (4, @d_lun, '14:00', '18:00', @b_cons,  @sede_central),
  (4, @d_mar, '14:00', '18:00', @b_cons,  @sede_central),
  (4, @d_mie, '14:00', '18:00', @b_cirug, @sede_central),
  (4, @d_jue, '14:00', '18:00', @b_cons,  @sede_central);

-- -----------------------------------------------------------------------------
--  PACIENTES (RF-01) — fichas tomadas del prototipo de alta fidelidad
-- -----------------------------------------------------------------------------
DELETE FROM paciente;

SET @seg_sanitas = (SELECT id FROM tipo_seguro WHERE nombre = 'Sanitas');
SET @seg_privado = (SELECT id FROM tipo_seguro WHERE nombre = 'Privado');
SET @seg_essalud = (SELECT id FROM tipo_seguro WHERE nombre = 'EsSalud');
SET @seg_sis     = (SELECT id FROM tipo_seguro WHERE nombre = 'SIS');

INSERT INTO paciente
  (id, nombres, apellidos, documento, fecha_nacimiento, edad, telefono, email,
   direccion, tipo_seguro_id, grupo_sanguineo, historial_ocular, alergias, activo, fecha_registro) VALUES
  (1, 'María Carmen', 'González Ruiz', '45678912C',
      '1958-04-12', 68, '655 123 456', 'maria.g@email.com', 'Av. Los Olivos 1234, Lince',
      @seg_sanitas, 'O+', 'Glaucoma de ángulo abierto en ojo derecho.', 'Penicilina', 1, NOW()),
  (2, 'Javier',   'López Fernández', '22334455B',
      '1984-09-30', 42, '600 987 654', 'j.lopez@email.com', 'Calle Las Begonias 45, San Isidro',
      @seg_privado, 'A+', NULL, NULL, 1, NOW()),
  (3, 'Juan Antonio', 'Pérez García', '33445566C',
      '1958-01-01', 68, '+51 600 123 456', 'juan.perez@email.com', 'Av. Arequipa 890, Miraflores',
      @seg_sanitas, 'O+',
      'Sospecha de glaucoma (OD). Cataratas leves (AO). Presbicia.',
      'Penicilina, Latex (Leve)', 1, NOW()),
  (4, 'Eleanor', 'Vance Muñoz', '84729-A',
      '1981-05-22', 45, '955 330 112', 'eleanor.vance@email.com', 'Jr. Las Begonias 120, Barranco',
      @seg_essalud, 'B+', 'Glaucoma de ángulo abierto (diagnosticado oct 2021).', NULL, 1, NOW()),
  (5, 'Ana Lucía', 'Ramírez Soto', '70124563B',
      '1996-11-08', 29, '944 887 003', 'ana.ramirez@email.com', 'Av. Brasil 1450, Magdalena',
      @seg_sis, 'AB+', NULL, NULL, 1, NOW()),
  (6, 'Pedro', 'Quispe Mamani', '48213975D',
      '1972-02-19', 54, '933 220 118', 'pedro.q@email.com', 'Calle Tarapaca 220, Surquillo',
      @seg_sanitas, 'A-', 'Retinopatía diabética no proliferativa.', NULL, 1, NOW()),
  (7, 'Sofía', 'Delgado Paredes', '45963018C',
      '2016-06-05', 10, '912 445 778', 'sofia.delgado@email.com', 'Av. La Paz 300, San Miguel',
      @seg_sis, 'O+', NULL, NULL, 1, NOW()),
  (8, 'Carlos Alberto', 'Medrano Chávez', '40658712F',
      '2001-08-27', 25, '977 552 004', 'c.medrano@email.com', 'Jr. Union 1020, Pueblo Libre',
      @seg_privado, 'A+', 'Miopía alta.', NULL, 1, NOW()),
  (9, 'Rosa Elena', 'Vásquez Ríos', '71234509B',
      '1969-12-14', 57, '901 223 556', 'rosa.vasquez@email.com', 'Calle Necochea 55, Miraflores',
      @seg_essalud, 'O-', 'Catarata nuclear moderada (AO).', 'Sulfonamidas', 1, NOW()),
  (10,'Diego',    'Chávez Núñez', '89123456C',
      '2011-03-03', 15, '955 118 442', 'diego.chavez@email.com', 'Av. Pardo 800, Jesús María',
      @seg_sis, 'B+', NULL, NULL, 1, NOW());

-- Nota: los documentos de identidad son ÚNICOS (regla de negocio RF1.2).

-- -----------------------------------------------------------------------------
--  CITAS MÉDICAS (RF-03)
--  Fechas relativas a CURDATE() para que el prototipo siempre muestre agenda viva.
-- -----------------------------------------------------------------------------
DELETE FROM cita;

SET @ec_programada = (SELECT id FROM estado_cita WHERE codigo = 'PROGRAMADA');
SET @ec_confirmada = (SELECT id FROM estado_cita WHERE codigo = 'CONFIRMADA');
SET @ec_espera     = (SELECT id FROM estado_cita WHERE codigo = 'EN_ESPERA');
SET @ec_consulta   = (SELECT id FROM estado_cita WHERE codigo = 'EN_CONSULTA');
SET @ec_cancelada  = (SELECT id FROM estado_cita WHERE codigo = 'CANCELADA');
SET @tc_control    = (SELECT id FROM tipo_consulta WHERE codigo = 'CONTROL');
SET @tc_despistaje = (SELECT id FROM tipo_consulta WHERE codigo = 'DESPISTAJE');
SET @tc_urgencia   = (SELECT id FROM tipo_consulta WHERE codigo = 'URGENCIA');
SET @tc_primera    = (SELECT id FROM tipo_consulta WHERE codigo = 'PRIMERA_EVALUACION');
SET @tc_postop     = (SELECT id FROM tipo_consulta WHERE codigo = 'POST_OPERATORIO');

INSERT INTO cita
  (paciente_id, oftalmologo_id, sede_id, consultorio, fecha, hora_inicio, hora_fin,
   tipo_consulta_id, estado_cita_id, motivo, nota_interna, bloqueo) VALUES
  -- Agenda de HOY — panel de recepción / panel del especialista
  (1,  1, @sede_central, 'C-01', CURDATE(),        '08:00','08:30', @tc_control,  @ec_confirmada, 'Control de glaucoma',                NULL, 1),
  (4,  1, @sede_central, 'C-01', CURDATE(),        '09:00','09:30', @tc_control,  @ec_espera,     'Control mensual de PIO',             NULL, 1),
  (9,  1, @sede_central, 'C-01', CURDATE(),        '10:00','10:30', @tc_primera,   @ec_confirmada, 'Valoración de catarata',             NULL, 1),
  (5,  1, @sede_central, 'C-01', CURDATE(),        '11:00','11:30', @tc_control,  @ec_confirmada, 'Revisión de receta oftálmica',       NULL, 1),
  (6,  2, @sede_central, 'C-02', CURDATE(),        '08:30','09:00', @tc_postop,    @ec_confirmada, 'Control posquirúrgico de retina',    NULL, 1),
  (2,  2, @sede_central, 'C-02', CURDATE(),        '09:30','10:00', @tc_despistaje,@ec_confirmada, 'Despistaje de glaucoma',             NULL, 1),
  (8,  3, @sede_central, 'C-03', CURDATE(),        '09:00','09:30', @tc_despistaje,@ec_espera,     'Consulta refractiva',                NULL, 1),
  (10, 3, @sede_central, 'C-03', CURDATE(),        '10:00','10:30', @tc_consulta,  @ec_consulta,   'Revisión de agudeza visual',         NULL, 1),
  -- Agenda de la semana — coincide con el prototipo 3.6.7
  (3,  1, @sede_central, 'C-01', DATE_ADD(CURDATE(), INTERVAL 1 DAY), '08:00','09:00', @tc_postop,   @ec_programada, 'Examen integral',                   NULL, 1),
  (7,  3, @sede_central, 'C-03', DATE_ADD(CURDATE(), INTERVAL 1 DAY), '09:00','09:30', @tc_despistaje,@ec_programada, 'Despistaje de catarata infantil',    NULL, 1),
  (6,  2, @sede_central, 'C-02', DATE_ADD(CURDATE(), INTERVAL 2 DAY), '10:00','12:00', @tc_postop,   @ec_programada, 'Examen de retina',                   NULL, 1),
  (5,  1, @sede_central, 'C-01', DATE_ADD(CURDATE(), INTERVAL 2 DAY), '08:00','08:30', @tc_control,   @ec_programada, 'Seguimiento de glaucoma',            NULL, 1),
  (1,  1, @sede_central, 'C-01', DATE_ADD(CURDATE(), INTERVAL 2 DAY), '09:00','09:30', @tc_control,   @ec_cancelada,  'Control de glaucoma',                'Reprogramada por el paciente', 0),
  (2,  3, @sede_central, 'C-03', DATE_ADD(CURDATE(), INTERVAL 3 DAY), '10:00','10:30', @tc_urgencia,  @ec_programada, 'Urgencia por ojo rojo',              NULL, 1),
  (9,  1, @sede_central, 'C-01', DATE_ADD(CURDATE(), INTERVAL 3 DAY), '11:00','11:30', @tc_primera,   @ec_programada, 'Evaluación prequirúrgica',           NULL, 1),
  (3,  4, @sede_central, 'C-04', DATE_ADD(CURDATE(), INTERVAL 4 DAY), '14:00','14:30', @tc_primera,   @ec_programada, 'Primera evaluación',                NULL, 1),
  (4,  1, @sede_central, 'C-01', DATE_ADD(CURDATE(), INTERVAL 7 DAY), '09:00','09:30', @tc_control,   @ec_programada, 'Control mensual de PIO',             NULL, 1),
  (6,  2, @sede_central, 'C-02', DATE_ADD(CURDATE(), INTERVAL 7 DAY), '08:00','08:30', @tc_postop,    @ec_programada, 'Control posquirúrgico',              NULL, 1);

-- -----------------------------------------------------------------------------
--  HISTORIAL MÉDICO (RF-02) — incluye el caso de glaucoma de la pantalla 3.6.4
-- -----------------------------------------------------------------------------
DELETE FROM examen;
DELETE FROM consulta;

SET @tipo_control  = (SELECT id FROM tipo_consulta WHERE codigo = 'CONTROL');
SET @tipo_primera  = (SELECT id FROM tipo_consulta WHERE codigo = 'PRIMERA_EVALUACION');
SET @tipo_postop   = (SELECT id FROM tipo_consulta WHERE codigo = 'POST_OPERATORIO');
SET @tipo_desp     = (SELECT id FROM tipo_consulta WHERE codigo = 'DESPISTAJE');
SET @tipo_exam     = (SELECT id FROM tipo_consulta WHERE codigo = 'EXAMEN_INTEGRAL');

-- Eleanor Vance (id 4): 7 controles de glaucoma → serie de PIO para la gráfica
INSERT INTO consulta
  (paciente_id, oftalmologo_id, sede_id, fecha, tipo_consulta_id,
   agudeza_od, agudeza_oi, pio_od, pio_oi, pupilas, biomicroscopia, fondo_ojo,
   diagnostico, cie10, soap_subjetivo, soap_objetivo, soap_evaluacion, soap_plan) VALUES
  (4, 1, @sede_central, DATE_SUB(CURDATE(), INTERVAL 210 DAY), @tipo_primera,
   '20/30','20/40', 18.0, 19.0, 'Isocóricas y reactivas', 'Ángulo abierto bilateral', 'Papiledema incipiente OD',
   'Glaucoma primario de ángulo abierto', 'H40.10',
   'Dificultad para ver de lejos, siento que el tunnel se reduce.',
   'PIO OD 18 mmHg, OI 19 mmHg. Angulo abierto 360°.',
   'Glaucoma incipiente. Iniciar tratamiento tópico.',
   'Latanoprost 0.005% nightly. Control en 30 días.'),
  (4, 1, @sede_central, DATE_SUB(CURDATE(), INTERVAL 180 DAY), @tipo_control,
   '20/25','20/40', 17.5, 18.2, 'Isocóricas y reactivas', 'Ángulo abierto bilateral', NULL,
   'Glaucoma primario de ángulo abierto', 'H40.10',
   'Sin Complaints nuevas.', 'PIO OD 17.5, OI 18.2.', 'Respuesta favorable.', 'Continuar esquema actual.'),
  (4, 1, @sede_central, DATE_SUB(CURDATE(), INTERVAL 150 DAY), @tipo_control,
   '20/25','20/30', 17.0, 18.0, 'Isocóricas y reactivas', NULL, NULL,
   'Glaucoma primario de ángulo abierto', 'H40.10',
   'Visión más clara por las mañanas.', 'PIO OD 17, OI 18.', 'Estable.', 'Continuar esquema actual.'),
  (4, 1, @sede_central, DATE_SUB(CURDATE(), INTERVAL 120 DAY), @tipo_control,
   '20/25','20/30', 16.0, 17.2, 'Isocóricas y reactivas', NULL, NULL,
   'Glaucoma primario de ángulo abierto', 'H40.10',
   'Ocasional cefalea frontal.', 'PIO OD 16, OI 17.2.', 'Mejora progresiva.', 'Mantener dosis.'),
  (4, 1, @sede_central, DATE_SUB(CURDATE(), INTERVAL 90 DAY), @tipo_control,
   '20/20','20/30', 14.5, 15.8, 'Isocóricas y reactivas', NULL, NULL,
   'Glaucoma primario de ángulo abierto', 'H40.10',
   'Mejor visión al despertar.', 'PIO OD 14.5, OI 15.8.', 'Objetivo alcanzado en OD.', 'Mantener Latanoprost.'),
  (4, 1, @sede_central, DATE_SUB(CURDATE(), INTERVAL 30 DAY), @tipo_control,
   '20/20','20/30', 14.0, 15.2, 'Isocóricas y reactivas', NULL, NULL,
   'Glaucoma primario de ángulo abierto', 'H40.10',
   'Sin síntomas de ojo seco.', 'PIO OD 14, OI 15.2.', 'Campos estables.', 'Continuar tratamiento actual.'),
  (4, 1, @sede_central, CURDATE(), @tipo_control,
   '20/20','20/30', 14.0, 14.0, 'Isocóricas y reactivas', NULL, NULL,
   'Glaucoma primario de ángulo abierto', 'H40.10',
   'Campos estables. Se continúa tratamiento actual.', 'PIO OD 14, OI 14.', 'Estable.', 'Control en 6 meses.');

-- María Carmen González (id 1): catarata
INSERT INTO consulta
  (paciente_id, oftalmologo_id, sede_id, fecha, tipo_consulta_id,
   agudeza_od, agudeza_oi, pio_od, pio_oi, diagnostico, cie10, soap_subjetivo, soap_plan) VALUES
  (1, 1, @sede_central, DATE_SUB(CURDATE(), INTERVAL 120 DAY), @tipo_primera,
   '20/40','20/50', 16.0, 16.5, 'Catarata nuclear moderada (AO)', 'H25.11',
   'Visión borrosa progresiva, sobre todo de lejos.', 'Evaluación para cirugía de catarata.'),
  (1, 4, @sede_central, DATE_SUB(CURDATE(), INTERVAL 60 DAY), @tipo_control,
   '20/25','20/30', 15.5, 16.0, 'Catarata nuclear moderada (AO)', 'H25.11',
   'Empeoró la visión nocturna.', 'Valorar facofacización OD.'),
  (1, 4, @sede_central, DATE_SUB(CURDATE(), INTERVAL 10 DAY), @tipo_control,
   '20/25','20/30', 15.0, 15.5, 'Catarata nuclear moderada (AO)', 'H25.11',
   'Dificultad para conducir de noche.', 'Programar cirugía en próximo trimestre.');

-- Juan Antonio Pérez (id 3)
INSERT INTO consulta
  (paciente_id, oftalmologo_id, sede_id, fecha, tipo_consulta_id,
   agudeza_od, agudeza_oi, pio_od, pio_oi, diagnostico, cie10, soap_subjetivo, soap_plan) VALUES
  (3, 1, @sede_central, DATE_SUB(CURDATE(), INTERVAL 45 DAY), @tipo_primera,
   '20/25','20/30', 17.0, 17.5, 'Sospecha de glaucoma (OD)', 'H40.00',
   'Antecedentes familiares de glaucoma. Tensión arterial alta.',
   'Tonometría y campimetría cada 6 meses.'),
  (3, 1, @sede_central, CURDATE(), @tipo_exam,
   '20/25','20/30', 17.0, 17.0, 'Cataratas leves (AO). Presbicia', 'H52.11',
   'Revisión anual.', 'Corrección óptica y seguimiento.');

-- Pedro Quispe (id 6) — post-operatorio de retina
INSERT INTO consulta
  (paciente_id, oftalmologo_id, sede_id, fecha, tipo_consulta_id,
   agudeza_od, agudeza_oi, pio_od, pio_oi, diagnostico, cie10, soap_subjetivo, soap_plan) VALUES
  (6, 2, @sede_central, DATE_SUB(CURDATE(), INTERVAL 75 DAY), @tipo_postop,
   '20/60','20/30', 15.0, 15.0, 'Post-operatorio de vitrectomía OD', 'H35.20',
   'Post-cirugía de retina. Recoveración.', 'Continuar gotas y control en 15 días.'),
  (6, 2, @sede_central, DATE_SUB(CURDATE(), INTERVAL 45 DAY), @tipo_postop,
   '20/40','20/30', 15.0, 15.0, 'Post-operatorio de vitrectomía OD', 'H35.20',
   'Visión en mejoría.', 'Control en 30 días.'),
  (6, 2, @sede_central, CURDATE(), @tipo_postop,
   '20/25','20/30', 14.5, 14.5, 'Recuperación post-vitrectomía OD', 'H35.20',
   'Excelente evolución.', 'Alta médica.');

-- Rosa Vásquez (id 9)
INSERT INTO consulta
  (paciente_id, oftalmologo_id, sede_id, fecha, tipo_consulta_id,
   agudeza_od, agudeza_oi, diagnostico, cie10, soap_subjetivo, soap_plan) VALUES
  (9, 1, @sede_central, DATE_SUB(CURDATE(), INTERVAL 30 DAY), @tipo_primera,
   '20/50','20/50', 'Catarata nuclear moderada (AO)', 'H25.11',
   'Visión nublada ambos ojos.', 'Evaluación prequirúrgica.');

-- Ana Lucía Ramírez (id 5)
INSERT INTO consulta
  (paciente_id, oftalmologo_id, sede_id, fecha, tipo_consulta_id,
   agudeza_od, agudeza_oi, pio_od, pio_oi, diagnostico, cie10, soap_subjetivo, soap_plan) VALUES
  (5, 1, @sede_central, DATE_SUB(CURDATE(), INTERVAL 90 DAY), @tipo_control,
   '20/20','20/20', 13.0, 13.0, 'Glaucoma de ángulo abierto leve OD', 'H40.10',
   'Chequeo rutinario.', 'Renovar receta.');

-- Sofía Delgado (id 7) — oftalmología pediátrica
INSERT INTO consulta
  (paciente_id, oftalmologo_id, sede_id, fecha, tipo_consulta_id,
   agudeza_od, agudeza_oi, diagnostico, cie10, soap_subjetivo, soap_plan) VALUES
  (7, 3, @sede_central, DATE_SUB(CURDATE(), INTERVAL 60 DAY), @tipo_desp,
   '20/25','20/25', 'Astigmatismo leve (AO)', 'H52.00',
   'Desempeño escolar regular.', 'Corrección con lentes.');

-- Carlos Medrano (id 8)
INSERT INTO consulta
  (paciente_id, oftalmologo_id, sede_id, fecha, tipo_consulta_id,
   agudeza_od, agudeza_oi, diagnostico, cie10, soap_subjetivo, soap_plan) VALUES
  (8, 3, @sede_central, DATE_SUB(CURDATE(), INTERVAL 20 DAY), @tipo_desp,
   '20/60','20/60', 'Miopía alta (AO)', 'H52.10',
   'Visión borrosa de lejos.', 'Evaluación para cirugía refractiva.');

-- Diego Chávez (id 10)
INSERT INTO consulta
  (paciente_id, oftalmologo_id, sede_id, fecha, tipo_consulta_id,
   agudeza_od, agudeza_oi, diagnostico, soap_subjetivo, soap_plan) VALUES
  (10, 3, @sede_central, DATE_SUB(CURDATE(), INTERVAL 40 DAY), @tipo_desp,
   '20/30','20/30', 'Miopía simple', 'Vision con lentes correcta.', 'Control anual.');

-- Javier López (id 2)
INSERT INTO consulta
  (paciente_id, oftalmologo_id, sede_id, fecha, tipo_consulta_id,
   agudeza_od, agudeza_oi, pio_od, pio_oi, diagnostico, soap_subjetivo, soap_plan) VALUES
  (2, 2, @sede_central, DATE_SUB(CURDATE(), INTERVAL 25 DAY), @tipo_desp,
   '20/25','20/25', 15.0, 15.0, 'Examen normal', 'Sin hallazgos.', 'Control en 1 año.');

-- -----------------------------------------------------------------------------
--  EXÁMENES ADJUNTOS (RF2.4)
-- -----------------------------------------------------------------------------
SET @ex_retino = (SELECT id FROM tipo_examen WHERE codigo = 'RETINOGRAFIA');
SET @ex_oct    = (SELECT id FROM tipo_examen WHERE codigo = 'OCT');
SET @ex_campi  = (SELECT id FROM tipo_examen WHERE codigo = 'CAMPIMETRIA');

INSERT INTO examen (consulta_id, paciente_id, tipo_examen_id, archivo_url, nombre_archivo, mime_type, descripcion, fecha) VALUES
  ((SELECT id FROM consulta WHERE paciente_id=4 ORDER BY fecha LIMIT 1), 4, @ex_oct,
     '/uploads/examenes/e4oct_inicial.pdf','oct_inicial.pdf','application/pdf','OCT de nervio óptico basal', DATE_SUB(CURDATE(), INTERVAL 210 DAY)),
  ((SELECT id FROM consulta WHERE paciente_id=4 ORDER BY fecha DESC LIMIT 1), 4, @ex_oct,
     '/uploads/examenes/e4oct_control.pdf','oct_control.pdf','application/pdf','OCT de seguimiento', DATE_SUB(CURDATE(), INTERVAL 30 DAY)),
  ((SELECT id FROM consulta WHERE paciente_id=4 ORDER BY fecha DESC LIMIT 1), 4, @ex_campi,
     '/uploads/examenes/e4campimetria.pdf','campimetria.pdf','application/pdf','Campimetría Humphrey 24-2', DATE_SUB(CURDATE(), INTERVAL 30 DAY)),
  ((SELECT id FROM consulta WHERE paciente_id=1 ORDER BY fecha LIMIT 1), 1, @ex_retino,
     '/uploads/examenes/m1retinografia.pdf','retinografia.pdf','application/pdf','Retinografía basal prequirúrgica', DATE_SUB(CURDATE(), INTERVAL 120 DAY)),
  ((SELECT id FROM consulta WHERE paciente_id=6 ORDER BY fecha LIMIT 1), 6, @ex_oct,
     '/uploads/examenes/p6oct_postop.pdf','oct_postop.pdf','application/pdf','OCT macular post-operatoria', DATE_SUB(CURDATE(), INTERVAL 75 DAY)),
  ((SELECT id FROM consulta WHERE paciente_id=3 ORDER BY fecha LIMIT 1), 3, @ex_campi,
     '/uploads/examenes/j3campimetria.pdf','campimetria.pdf','application/pdf','Campimetría de despistaje', DATE_SUB(CURDATE(), INTERVAL 45 DAY));

-- -----------------------------------------------------------------------------
--  TRATAMIENTOS (RF-04)
-- -----------------------------------------------------------------------------
DELETE FROM control_tratamiento;
DELETE FROM cirugia;
DELETE FROM tratamiento;

SET @tt_med  = (SELECT id FROM tipo_tratamiento WHERE codigo = 'MEDICAMENTO');
SET @tt_lent = (SELECT id FROM tipo_tratamiento WHERE codigo = 'LENTES');
SET @tt_ter  = (SELECT id FROM tipo_tratamiento WHERE codigo = 'TERAPIA');
SET @tt_cir  = (SELECT id FROM tipo_tratamiento WHERE codigo = 'CIRUGIA');
SET @et_act   = (SELECT id FROM estado_tratamiento WHERE codigo = 'ACTIVO');
SET @et_comp  = (SELECT id FROM estado_tratamiento WHERE codigo = 'COMPLETADO');
SET @o_od     = (SELECT id FROM ojo WHERE codigo = 'OD');
SET @o_oi     = (SELECT id FROM ojo WHERE codigo = 'OI');
SET @o_ao     = (SELECT id FROM ojo WHERE codigo = 'AO');

INSERT INTO tratamiento
  (paciente_id, oftalmologo_id, consulta_id, tipo_id, estado_id, medicamento, principio_activo,
   dosis, ojo, frecuencia, duracion, fecha_inicio, fecha_fin, fecha_control, indicaciones, activo) VALUES
  (4, 1, NULL, @tt_med, @et_act, 'Latanoprost 0.005%', 'Latanoprost',
   '1 gota', @o_od, '1 gota en AO cada noche', 'Indefinido', DATE_SUB(CURDATE(), INTERVAL 210 DAY), NULL, DATE_ADD(CURDATE(), INTERVAL 30 DAY),
   'Aplicar antes de dormir. Separar 5 minutos de otras gotas.', 1),
  (4, 1, NULL, @tt_med, @et_act, 'Timolol 0.5%', 'Timolol maleato',
   '1 gota', @o_ao, '1 gota en AO cada mañana', 'Indefinido', DATE_SUB(CURDATE(), INTERVAL 90 DAY), NULL, DATE_ADD(CURDATE(), INTERVAL 30 DAY),
   'Aplicar en la mañana. Vigilar signos de fatiga ocular.', 1),
  (1, 4, NULL, @tt_med, @et_comp, 'Tobramacina 0.3%', 'Tobramacina',
   '1 gota', @o_od, 'Cada 4 horas por 7 días', '7 días', DATE_SUB(CURDATE(), INTERVAL 12 DAY), DATE_SUB(CURDATE(), INTERVAL 5 DAY), NULL,
   'Antibiótico post-operatorio. Continuar hasta completar el esquema.', 0),
  (1, 4, NULL, @tt_lent, @et_act, 'Lentes bifocales progresivos', NULL,
   NULL, @o_ao, NULL, 'Uso permanente', DATE_SUB(CURDATE(), INTERVAL 60 DAY), NULL, DATE_ADD(CURDATE(), INTERVAL 60 DAY),
   'Graduación +2.00 / +2.50. Control yearly.', 1),
  (6, 2, NULL, @tt_med, @et_act, 'Prednisona 1%', 'Prednisona',
   '1 gota', @o_od, 'Cada 8 horas por 15 días', '15 días', DATE_SUB(CURDATE(), INTERVAL 30 DAY), DATE_SUB(CURDATE(), INTERVAL 15 DAY), DATE_ADD(CURDATE(), INTERVAL 15 DAY),
   'Esquema descendente. No suspender bruscamente.', 1),
  (3, 1, NULL, @tt_lent, @et_act, 'Lentes monofocales', NULL,
   NULL, @o_ao, NULL, 'Uso permanente', DATE_SUB(CURDATE(), INTERVAL 45 DAY), NULL, DATE_ADD(CURDATE(), INTERVAL 90 DAY),
   'Corrección para presbicia y catarata leve.', 1),
  (7, 3, NULL, @tt_lent, @et_act, 'Lentes -{1.50} +0.75', NULL,
   NULL, @o_ao, NULL, 'Uso permanente', DATE_SUB(CURDATE(), INTERVAL 60 DAY), NULL, DATE_ADD(CURDATE(), INTERVAL 180 DAY),
   'Uso escolar. Revisión a los 6 meses.', 1),
  (5, 1, NULL, @tt_ter, @et_act, 'Terapia de TRAIN (espacio restrictivo)', NULL,
   NULL, NULL, '2 sesiones por semana', '8 semanas', DATE_SUB(CURDATE(), INTERVAL 30 DAY), NULL, DATE_ADD(CURDATE(), INTERVAL 26 DAY),
   'Ejercicios de Focusing. No forzar el parpadeo.', 1);

-- -----------------------------------------------------------------------------
--  SEGUIMIENTO / CONTROLES DE TRATAMIENTO (RF4.5, pantalla 3.6.12)
-- -----------------------------------------------------------------------------
INSERT INTO control_tratamiento (tratamiento_id, oftalmologo_id, fecha, resultado, pio_od, pio_oi, observaciones) VALUES
  ((SELECT id FROM tratamiento WHERE medicamento LIKE 'Latanoprost%' LIMIT 1), 1, DATE_SUB(CURDATE(), INTERVAL 180 DAY), 'Sin Cambios', 17.5, 18.2, 'Tolera bien el fármaco. Sin efectos adversos.'),
  ((SELECT id FROM tratamiento WHERE medicamento LIKE 'Latanoprost%' LIMIT 1), 1, DATE_SUB(CURDATE(), INTERVAL 150 DAY), 'Mejora de PIO', 17.0, 18.0, 'Descenso progresivo de la presión intraocular.'),
  ((SELECT id FROM tratamiento WHERE medicamento LIKE 'Latanoprost%' LIMIT 1), 1, DATE_SUB(CURDATE(), INTERVAL 120 DAY), 'Mejora de PIO', 16.0, 17.2, 'Respuesta terapéutica favorable.'),
  ((SELECT id FROM tratamiento WHERE medicamento LIKE 'Latanoprost%' LIMIT 1), 1, DATE_SUB(CURDATE(), INTERVAL  90 DAY), 'Completado',  14.5, 15.8, 'Objetivo de PIO alcanzado en ojo derecho.'),
  ((SELECT id FROM tratamiento WHERE medicamento LIKE 'Latanoprost%' LIMIT 1), 1, DATE_SUB(CURDATE(), INTERVAL  30 DAY), 'Completado',  14.0, 15.2, 'Campos visuales estables. Continuar esquema.'),
  ((SELECT id FROM tratamiento WHERE medicamento LIKE 'Latanoprost%' LIMIT 1), 1, CURDATE(),                            'Pendiente',   NULL, NULL,  'Próximo control programado.');

-- -----------------------------------------------------------------------------
--  PROCEDIMIENTOS QUIRÚRGICOS (RF4.4, pantalla 3.6.13)
-- -----------------------------------------------------------------------------
INSERT INTO cirugia
  (paciente_id, oftalmologo_id, diagnostico_preop, tipo_cirugia, ojo, fecha_programada, fecha_realizada, anestesia, tecnica, incidencias, lente_intraocular, estado) VALUES
  (6, 2, 'Retinopatía diabética proliferativa OD', 'Vitrectomía posterior con laser endolaser', @o_od,
      DATE_SUB(CURDATE(), INTERVAL 76 DAY), DATE_SUB(CURDATE(), INTERVAL 75 DAY), 'Anestesia local retrobulbar',
      'Vitrectomía core 23G con endolaser 360° y crioterapia periférica.',
      'Sin incidencias intraoperatorias.', NULL, 'REALIZADA'),
  (1, 4, 'Catarata nuclear moderada OD', 'Facofacización con LIO', @o_od,
      DATE_ADD(CURDATE(), INTERVAL 20 DAY), NULL, 'Anestesia local subtenoniana',
      'Facoemulsificación 23G, 40-45 ccs, implante de LIO plegable en cámara anterior.',
      NULL, 'AcrySof IQ SN60AL +21.0 D', 'PROGRAMADA'),
  (3, 1, 'Sospecha de glaucoma OD', 'Trabeculectomía', @o_od,
      DATE_ADD(CURDATE(), INTERVAL 45 DAY), NULL, 'Anestesia general',
      'Esclerectomía parcial con colagenoma.',
      NULL, NULL, 'PROGRAMADA');

-- -----------------------------------------------------------------------------
--  AUDITORÍA DE DEMOSTRACIÓN (RNF-01) — alimenta el panel del administrador 3.6.21
-- -----------------------------------------------------------------------------
INSERT INTO auditoria (usuario_id, username, accion, recurso, recurso_id, descripcion, ip_address, navegador, resultado, fecha) VALUES
  (2, 'dra.rostova', 'LOGIN_OK', NULL, NULL, 'Inicio de sesión correcto',                 '192.168.1.45',  'Chrome 141 / Windows',  'EXITOSO', DATE_SUB(NOW(), INTERVAL 15 MINUTE)),
  (1, 'admin',       'LOGIN_OK', NULL, NULL, 'Inicio de sesión correcto',                 '10.0.0.12',    'Edge 140 / Windows',    'EXITOSO', DATE_SUB(NOW(), INTERVAL 90 MINUTE)),
  (NULL,'desconocido', 'LOGIN_FAIL', NULL, NULL, 'Credenciales incorrectas',                 '45.33.22.11',  'Firefox 133 / Linux',   'FALLIDO', DATE_SUB(NOW(), INTERVAL 125 MINUTE)),
  (4, 'dr.mendoza',  'VER_HISTORIAL', 'CONSULTA', 6, 'Acceso al historial clínico del paciente 6', '192.168.1.77',  'Chrome 141 / macOS',   'EXITOSO', DATE_SUB(NOW(), INTERVAL 45 MINUTE)),
  (5, 'recepcion',   'CREAR', 'CITA', 1, 'Cita creada para el paciente 1',                 '10.0.0.30',    'Chrome 141 / Windows',  'EXITOSO', DATE_SUB(NOW(), INTERVAL 200 MINUTE)),
  (NULL,'anonimo',    'LOGIN_FAIL', NULL, NULL, 'Usuario inexistente',                        '185.220.101.5','Bot / curl',           'FALLIDO', DATE_SUB(NOW(), INTERVAL 320 MINUTE)),
  (3, 'dra.torres',  'LOGIN_OK', NULL, NULL, 'Inicio de sesión correcto',                  '10.0.0.18',    'Chrome 141 / Windows',  'EXITOSO', DATE_SUB(NOW(), INTERVAL 400 MINUTE));

SET FOREIGN_KEY_CHECKS = 1;

-- =============================================================================
--  RESUMEN DE CARGA
-- =============================================================================
SELECT 'Pacientes'      AS entidad, COUNT(*) AS registros FROM paciente
UNION ALL SELECT 'Oftalmólogos',  COUNT(*) FROM oftalmologo
UNION ALL SELECT 'Horarios',     COUNT(*) FROM horario_laboral
UNION ALL SELECT 'Citas',        COUNT(*) FROM cita
UNION ALL SELECT 'Consultas',     COUNT(*) FROM consulta
UNION ALL SELECT 'Exámenes',     COUNT(*) FROM examen
UNION ALL SELECT 'Tratamientos', COUNT(*) FROM tratamiento
UNION ALL SELECT 'Controles',    COUNT(*) FROM control_tratamiento
UNION ALL SELECT 'Cirugías',     COUNT(*) FROM cirugia
UNION ALL SELECT 'Usuarios',     COUNT(*) FROM usuario
UNION ALL SELECT 'Auditoría',    COUNT(*) FROM auditoria;