-- =============================================================================
--  CLÍNICA OFTALMOLÓGICA OJITOS  ·  Esquema de Base de Datos
--  Proyecto: Sistema Web de Gestión Clínica Oftalmológica
--  Grupo 05 · Orduña Montoya Denis Eduardo
--          Muñoz De La Cruz Fung Tay Antonyo
--          Paredes Tacuri Edgard Adriano
--  Docente: Jose Fernando Matos Vera
--
--  Motor   : MySQL 8.0.16+ (InnoDB, utf8mb4)
--  Fase    : 5 — Integración con Base de Datos
--  Módulo  : DDL (Definición de Esquema)
--
--  Para una reconstrucción total desde cero:
--      DROP DATABASE IF EXISTS clinica_ojitos;   -- opcional, ver 00_reset.sql
--  Este script NO hace DROP: es seguro ejecutarlo sobre una base existente.
--
--  Orden de ejecución:
--      01_esquema.sql  ->  02_datos_prueba.sql  ->  (opcional) 03_consultas.sql
-- =============================================================================

SET NAMES utf8mb4;
SET SESSION sql_mode = 'STRICT_TRANS_TABLES,NO_ENGINE_SUBSTITUTION';

CREATE DATABASE IF NOT EXISTS clinica_ojitos
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_unicode_ci;

USE clinica_ojitos;

-- =============================================================================
--  SECCIÓN 0 · CATÁLOGOS Y ENUMERACIONES
--  Los catálogos se modelan como tablas de referencia (y no como ENUM de MySQL)
--  para poder extenderlos sin migración de esquema — requisito de RNF-05
--  (Escalabilidad).
-- =============================================================================

CREATE TABLE IF NOT EXISTS rol (
  id          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  codigo      VARCHAR(30)     NOT NULL,
  nombre      VARCHAR(60)     NOT NULL,
  descripcion VARCHAR(255)    NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_rol_codigo (codigo)
) ENGINE=InnoDB;

-- Sede / consultorio. El esquema ya incluye `sede_id` en médico, horario, cita
-- y consulta para soportar múltiples sedes (RNF-05).
CREATE TABLE IF NOT EXISTS sede (
  id        INT UNSIGNED NOT NULL AUTO_INCREMENT,
  nombre    VARCHAR(100)      NOT NULL,
  direccion VARCHAR(255)      NULL,
  telefono  VARCHAR(30)       NULL,
  activo    TINYINT(1)        NOT NULL DEFAULT 1,
  PRIMARY KEY (id),
  UNIQUE KEY uq_sede_nombre (nombre)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS subespecialidad (
  id          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  codigo      VARCHAR(30)      NOT NULL,
  nombre      VARCHAR(80)      NOT NULL,
  descripcion VARCHAR(255)     NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_subesp_codigo (codigo)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS tipo_seguro (
  id     INT UNSIGNED NOT NULL AUTO_INCREMENT,
  nombre VARCHAR(80)      NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_seguro_nombre (nombre)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS estado_cita (
  id          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  codigo      VARCHAR(30)      NOT NULL,
  nombre      VARCHAR(60)      NOT NULL,
  descripcion VARCHAR(255)     NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_estado_cita_codigo (codigo)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS tipo_consulta (
  id     INT UNSIGNED NOT NULL AUTO_INCREMENT,
  codigo VARCHAR(40)       NOT NULL,
  nombre VARCHAR(80)       NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_tipo_consulta_codigo (codigo)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS ojo (
  id     INT UNSIGNED NOT NULL AUTO_INCREMENT,
  codigo VARCHAR(10)       NOT NULL,
  nombre VARCHAR(30)       NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_ojo_codigo (codigo)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS tipo_tratamiento (
  id     INT UNSIGNED NOT NULL AUTO_INCREMENT,
  codigo VARCHAR(40)       NOT NULL,
  nombre VARCHAR(80)       NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_tipo_trat_codigo (codigo)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS estado_tratamiento (
  id     INT UNSIGNED NOT NULL AUTO_INCREMENT,
  codigo VARCHAR(30)      NOT NULL,
  nombre VARCHAR(60)      NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_estado_trat_codigo (codigo)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS tipo_examen (
  id     INT UNSIGNED NOT NULL AUTO_INCREMENT,
  codigo VARCHAR(40)       NOT NULL,
  nombre VARCHAR(100)      NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_tipo_examen_codigo (codigo)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS dia_semana (
  id     INT UNSIGNED NOT NULL AUTO_INCREMENT,
  codigo VARCHAR(10)       NOT NULL,
  nombre VARCHAR(20)       NOT NULL,
  orden  INT UNSIGNED NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_dia_codigo (codigo)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS tipo_bloque_horario (
  id     INT UNSIGNED NOT NULL AUTO_INCREMENT,
  codigo VARCHAR(30)       NOT NULL,
  nombre VARCHAR(60)       NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_tipo_bloque_codigo (codigo)
) ENGINE=InnoDB;

-- ---------------------------- Catálogos: datos ---------------------------
INSERT INTO rol (codigo, nombre, descripcion) VALUES
  ('ADMINISTRADOR','Administrador','Control total del sistema, gestión de médicos, horarios y auditoría.'),
  ('OFTALMOLOGO','Oftalmólogo','Profesional tratante: consultas, diagnósticos y tratamientos.'),
  ('RECEPCIONISTA','Recepcionista','Admisión de pacientes, agenda de citas y triaje.'),
  ('PACIENTE','Paciente','Acceso de solo lectura a su propia información clínica.')
ON DUPLICATE KEY UPDATE nombre=VALUES(nombre), descripcion=VALUES(descripcion);

INSERT INTO sede (nombre, direccion, telefono) VALUES
  ('Sede Central - Ojitos','Av. Los Olivos 1234, Lince, Lima','(01) 555-0101')
ON DUPLICATE KEY UPDATE direccion=VALUES(direccion), telefono=VALUES(telefono);

INSERT INTO subespecialidad (codigo, nombre, descripcion) VALUES
  ('RETINA','Retina','Retina y vítreo.'),
  ('CORNEA','Córnea','Córnea y segmento anterior.'),
  ('GLAUCOMA','Glaucoma','Glaucoma y presión intraocular.'),
  ('PEDIATRICA','Pediátrica','Oftalmología pediátrica.'),
  ('CATARATA','Catarata','Catarata y segmento anterior.')
ON DUPLICATE KEY UPDATE nombre=VALUES(nombre), descripcion=VALUES(descripcion);

INSERT INTO tipo_seguro (nombre) VALUES
  ('Sanitas'),('Privado'),('EsSalud'),('SIS'),('Pacifico'),('Oncoseguro'),('Particular')
ON DUPLICATE KEY UPDATE nombre=VALUES(nombre);

INSERT INTO estado_cita (codigo, nombre, descripcion) VALUES
  ('PROGRAMADA','Programada','Cita reservada, pendiente de confirmación.'),
  ('CONFIRMADA','Confirmada','El paciente confirmó su asistencia.'),
  ('EN_ESPERA','En Espera','El paciente ingresó y aguarda atención.'),
  ('EN_CONSULTA','En Consulta','Atención en curso.'),
  ('COMPLETADA','Completada','Consulta finalizada.'),
  ('CANCELADA','Cancelada','Turno anulado por el paciente o por la clínica.'),
  ('NO_ASISTIO','No Asistió','El paciente no se presentó a la cita programada.')
ON DUPLICATE KEY UPDATE nombre=VALUES(nombre), descripcion=VALUES(descripcion);

INSERT INTO tipo_consulta (codigo, nombre) VALUES
  ('CONTROL','Control'),
  ('DESPISTAJE','Despistaje'),
  ('URGENCIA','Urgencia'),
  ('PRIMERA_EVALUACION','Primera Evaluación'),
  ('POST_OPERATORIO','Post-operatorio'),
  ('CONSULTA_REFRACTIVA','Consulta Refractiva'),
  ('EXAMEN_INTEGRAL','Examen Integral')
ON DUPLICATE KEY UPDATE nombre=VALUES(nombre);

INSERT INTO ojo (codigo, nombre) VALUES
  ('OD','Ojo Derecho'),('OI','Ojo Izquierdo'),('AO','Ambos Ojos')
ON DUPLICATE KEY UPDATE nombre=VALUES(nombre);

INSERT INTO tipo_tratamiento (codigo, nombre) VALUES
  ('MEDICAMENTO','Medicamento'),
  ('LENTES','Prescripción Óptica'),
  ('TERAPIA','Terapia Visual'),
  ('CIRUGIA','Procedimiento Quirúrgico')
ON DUPLICATE KEY UPDATE nombre=VALUES(nombre);

INSERT INTO estado_tratamiento (codigo, nombre) VALUES
  ('ACTIVO','Activo'),
  ('COMPLETADO','Completado'),
  ('SUSPENDIDO','Suspendido'),
  ('ANULADO','Anulado')
ON DUPLICATE KEY UPDATE nombre=VALUES(nombre);

INSERT INTO tipo_examen (codigo, nombre) VALUES
  ('RETINOGRAFIA','Retinografía'),
  ('OCT','Tomografía OCT'),
  ('CAMPIMETRIA','Campimetría'),
  ('BIOMICROSCOPIA','Biomicroscopía'),
  ('TONOMETRIA','Tonometría'),
  ('OCT_GLAUCOMA','OCT de nervio óptico'),
  ('ULTRASONIDO','Ultrasonido ocular'),
  ('OTRO','Otro')
ON DUPLICATE KEY UPDATE nombre=VALUES(nombre);

INSERT INTO dia_semana (codigo, nombre, orden) VALUES
  ('LUN','Lunes',1),('MAR','Martes',2),('MIE','Miércoles',3),('JUE','Jueves',4),
  ('VIE','Viernes',5),('SAB','Sábado',6),('DOM','Domingo',7)
ON DUPLICATE KEY UPDATE nombre=VALUES(nombre), orden=VALUES(orden);

INSERT INTO tipo_bloque_horario (codigo, nombre) VALUES
  ('CONSULTA','Consulta Externa'),
  ('CIRUGIA','Bloque Quirúrgico'),
  ('DESCANSO','Pausa / Almuerzo')
ON DUPLICATE KEY UPDATE nombre=VALUES(nombre);

-- =============================================================================
--  SECCIÓN 1 · SEGURIDAD DE ACCESO  (RF-06, RNF-01)
--  RNF-01: las contraseñas se almacenan con BCrypt, nunca en texto plano.
--  Los hashes semilla de 02_datos_prueba.sql corresponden a la contraseña
--  de prueba "Ojitos2026*" y NO deben usarse en un entorno productivo.
-- =============================================================================

CREATE TABLE IF NOT EXISTS usuario (
  id                BIGINT UNSIGNED   NOT NULL AUTO_INCREMENT,
  username          VARCHAR(60)       NOT NULL,
  password_hash     VARCHAR(100)      NOT NULL,
  email             VARCHAR(150)      NOT NULL,
  rol_id            INT UNSIGNED  NOT NULL,
  activo            TINYINT(1)        NOT NULL DEFAULT 1,
  intentos_fallidos INT UNSIGNED  NOT NULL DEFAULT 0 COMMENT 'RF6.2: máximo 3 intentos',
  ultimo_acceso     DATETIME          NULL,
  fecha_creacion    DATETIME          NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_usuario_username (username),
  UNIQUE KEY uq_usuario_email (email),
  KEY ix_usuario_rol (rol_id),
  CONSTRAINT fk_usuario_rol FOREIGN KEY (rol_id) REFERENCES rol (id)
) ENGINE=InnoDB;

-- =============================================================================
--  SECCIÓN 2 · PACIENTES  (RF-01)
--  Regla de negocio RF1.2 → el documento de identidad es ÚNICO en el sistema.
-- =============================================================================

CREATE TABLE IF NOT EXISTS paciente (
  id               BIGINT UNSIGNED  NOT NULL AUTO_INCREMENT,
  nombres          VARCHAR(80)      NOT NULL,
  apellidos        VARCHAR(80)      NOT NULL,
  documento        VARCHAR(20)      NOT NULL COMMENT 'DNI o documento de identidad (único)',
  fecha_nacimiento DATE             NULL,
  edad             INT UNSIGNED NULL COMMENT 'Se mantiene para el prototipo; derivado de fecha_nacimiento',
  telefono         VARCHAR(30)      NULL,
  email            VARCHAR(150)     NULL,
  direccion        VARCHAR(255)     NULL,
  tipo_seguro_id   INT UNSIGNED NULL,
  grupo_sanguineo  VARCHAR(5)       NULL COMMENT 'O+, A+, B+, AB+, O-, A-, B-, AB-',
  foto_url         VARCHAR(255)     NULL,
  historial_ocular TEXT             NULL COMMENT 'Antecedentes visuales (RF1.3)',
  alergias         TEXT             NULL COMMENT 'Alergias medicamentosas (RF1.3)',
  activo           TINYINT(1)       NOT NULL DEFAULT 1,
  fecha_registro   DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_paciente_documento (documento),
  KEY ix_paciente_nombres (nombres, apellidos),
  KEY ix_paciente_activo (activo),
  KEY ix_paciente_seguro (tipo_seguro_id),
  CONSTRAINT fk_paciente_seguro FOREIGN KEY (tipo_seguro_id) REFERENCES tipo_seguro (id)
) ENGINE=InnoDB;

-- =============================================================================
--  SECCIÓN 3 · MÉDICOS OFTALMÓLOGOS  (RF-05)
--  Regla de negocio RF5.2 → el número de colegiatura es ÚNICO.
-- =============================================================================

CREATE TABLE IF NOT EXISTS oftalmologo (
  id                 BIGINT UNSIGNED  NOT NULL AUTO_INCREMENT,
  nombres            VARCHAR(80)      NOT NULL,
  apellidos          VARCHAR(80)      NOT NULL,
  email              VARCHAR(150)      NOT NULL,
  telefono           VARCHAR(30)       NULL,
  numero_colegiatura VARCHAR(30)      NOT NULL COMMENT 'Único en el sistema (RF5.2)',
  subespecialidad_id INT UNSIGNED NOT NULL,
  sede_id            INT UNSIGNED NULL,
  foto_url           VARCHAR(255)      NULL,
  activo             TINYINT(1)       NOT NULL DEFAULT 1 COMMENT 'Permite desactivar sin borrar (RF5.5)',
  fecha_ingreso      DATE             NOT NULL DEFAULT (CURRENT_DATE),
  PRIMARY KEY (id),
  UNIQUE KEY uq_oftalmo_colegiatura (numero_colegiatura),
  UNIQUE KEY uq_oftalmo_email (email),
  KEY ix_oftalmo_subesp (subespecialidad_id),
  KEY ix_oftalmo_activo (activo),
  CONSTRAINT fk_oftalmo_subesp FOREIGN KEY (subespecialidad_id) REFERENCES subespecialidad (id),
  CONSTRAINT fk_oftalmo_sede    FOREIGN KEY (sede_id)            REFERENCES sede (id)
) ENGINE=InnoDB;

-- Vínculo opcional oftalmólogo <-> cuenta de acceso (RF-06 / RF-05).
-- Puede quedar en NULL si el Administrador aún no creó la cuenta.
CREATE TABLE IF NOT EXISTS usuario_oftalmologo (
  usuario_id     BIGINT UNSIGNED NOT NULL,
  oftalmologo_id BIGINT UNSIGNED NOT NULL,
  PRIMARY KEY (usuario_id, oftalmologo_id),
  UNIQUE KEY uq_uo_oftalmologo (oftalmologo_id),
  CONSTRAINT fk_uo_usuario    FOREIGN KEY (usuario_id)    REFERENCES usuario (id)    ON DELETE CASCADE,
  CONSTRAINT fk_uo_oftalmologo FOREIGN KEY (oftalmologo_id) REFERENCES oftalmologo (id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- =============================================================================
--  SECCIÓN 4 · HORARIOS MÉDICOS  (RF-05.4)
--  Matriz de disponibilidad semanal; el frontend la edita con drag & drop
--  (pantalla 3.6.17 del prototipo).
-- =============================================================================

CREATE TABLE IF NOT EXISTS horario_laboral (
  id             INT UNSIGNED      NOT NULL AUTO_INCREMENT,
  oftalmologo_id BIGINT UNSIGNED   NOT NULL,
  dia_semana_id  INT UNSIGNED  NOT NULL,
  hora_inicio    TIME              NOT NULL,
  hora_fin       TIME              NOT NULL,
  tipo_bloque_id INT UNSIGNED  NOT NULL,
  sede_id        INT UNSIGNED NULL,
  activo         TINYINT(1)        NOT NULL DEFAULT 1,
  PRIMARY KEY (id),
  UNIQUE KEY uq_horario_bloque (oftalmologo_id, dia_semana_id, hora_inicio, hora_fin),
  KEY ix_horario_oftalmo_dia (oftalmologo_id, dia_semana_id),
  CONSTRAINT fk_horario_oftalmo FOREIGN KEY (oftalmologo_id) REFERENCES oftalmologo (id)     ON DELETE CASCADE,
  CONSTRAINT fk_horario_dia      FOREIGN KEY (dia_semana_id)  REFERENCES dia_semana (id),
  CONSTRAINT fk_horario_tipo     FOREIGN KEY (tipo_bloque_id) REFERENCES tipo_bloque_horario (id),
  CONSTRAINT fk_horario_sede     FOREIGN KEY (sede_id)         REFERENCES sede (id),
  CONSTRAINT ck_horario_rango    CHECK (hora_fin > hora_inicio)
) ENGINE=InnoDB;

-- =============================================================================
--  SECCIÓN 5 · CITAS MÉDICAS  (RF-03)
--  Regla de negocio RF3.2 → no se pueden cruzar dos citas del mismo
--  oftalmólogo en el mismo horario.
--
--  Implementación: la columna generada `slot_ocupado` vale
--  '<fecha> <hora_inicio>' cuando la cita bloquea la agenda (bloqueo=1) y NULL
--  cuando está liberada. MySQL ignora los NULL en índices UNIQUE, de modo que:
--    · dos citas activas en el mismo slot  → conflicto (409 CruceDeHorario)
--    · N citas canceladas en el mismo slot  → permitido (el slot se libera)
-- =============================================================================

CREATE TABLE IF NOT EXISTS cita (
  id               BIGINT UNSIGNED   NOT NULL AUTO_INCREMENT,
  paciente_id      BIGINT UNSIGNED   NOT NULL,
  oftalmologo_id   BIGINT UNSIGNED   NOT NULL,
  sede_id          INT UNSIGNED  NULL,
  consultorio      VARCHAR(20)        NULL,
  fecha            DATE               NOT NULL,
  hora_inicio      TIME               NOT NULL,
  hora_fin         TIME               NOT NULL,
  tipo_consulta_id INT UNSIGNED   NULL,
  estado_cita_id   INT UNSIGNED   NOT NULL,
  motivo           VARCHAR(255)       NULL,
  nota_interna     VARCHAR(500)       NULL COMMENT 'Motivo de reprogramación / observaciones',
  bloqueo          TINYINT(1)         NOT NULL DEFAULT 1 COMMENT '1 = ocupa agenda; 0 = liberada',
  slot_ocupado     VARCHAR(20)
                    GENERATED ALWAYS AS
                    (IF(bloqueo = 1, CONCAT(fecha, ' ', hora_inicio), NULL)) STORED,
  fecha_creacion   DATETIME           NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_cita_agenda (oftalmologo_id, slot_ocupado),
  KEY ix_cita_paciente (paciente_id),
  KEY ix_cita_fecha (fecha),
  KEY ix_cita_estado (estado_cita_id),
  CONSTRAINT fk_cita_paciente FOREIGN KEY (paciente_id)      REFERENCES paciente (id),
  CONSTRAINT fk_cita_oftalmo  FOREIGN KEY (oftalmologo_id)   REFERENCES oftalmologo (id),
  CONSTRAINT fk_cita_sede     FOREIGN KEY (sede_id)           REFERENCES sede (id),
  CONSTRAINT fk_cita_tipo     FOREIGN KEY (tipo_consulta_id) REFERENCES tipo_consulta (id),
  CONSTRAINT fk_cita_estado   FOREIGN KEY (estado_cita_id)   REFERENCES estado_cita (id),
  CONSTRAINT ck_cita_rango    CHECK (hora_fin > hora_inicio)
) ENGINE=InnoDB;

-- =============================================================================
--  SECCIÓN 6 · HISTORIAL MÉDICO  (RF-02)
--  Registro de la consulta oftalmológica: signos vitales oculares, hallazgos,
--  diagnóstico y notas SOAP (pantalla 3.6.6 del prototipo).
-- =============================================================================

CREATE TABLE IF NOT EXISTS consulta (
  id               BIGINT UNSIGNED   NOT NULL AUTO_INCREMENT,
  paciente_id      BIGINT UNSIGNED   NOT NULL,
  oftalmologo_id   BIGINT UNSIGNED   NOT NULL,
  sede_id          INT UNSIGNED  NULL,
  fecha            DATETIME          NOT NULL,
  tipo_consulta_id INT UNSIGNED  NOT NULL,
  -- Signos vitales oculares
  agudeza_od       VARCHAR(10)        NULL COMMENT 'Snellen OD, ej. 20/25',
  agudeza_oi       VARCHAR(10)        NULL COMMENT 'Snellen OI',
  pio_od           DECIMAL(5,2)       NULL COMMENT 'Presión intraocular OD (mmHg)',
  pio_oi           DECIMAL(5,2)       NULL COMMENT 'Presión intraocular OI (mmHg)',
  -- Hallazgos
  pupilas          VARCHAR(80)        NULL,
  biomicroscopia   TEXT               NULL,
  fondo_ojo        TEXT               NULL,
  -- Diagnóstico
  diagnostico      VARCHAR(500)       NOT NULL,
  cie10            VARCHAR(10)        NULL,
  -- Notas SOAP
  soap_subjetivo   TEXT               NULL,
  soap_objetivo    TEXT               NULL,
  soap_evaluacion  TEXT               NULL,
  soap_plan        TEXT               NULL,
  observaciones    TEXT               NULL,
  fecha_creacion   DATETIME           NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY ix_consulta_paciente_fecha (paciente_id, fecha),
  KEY ix_consulta_oftalmo_fecha (oftalmologo_id, fecha),
  KEY ix_consulta_tipo (tipo_consulta_id),
  CONSTRAINT fk_consulta_paciente FOREIGN KEY (paciente_id)      REFERENCES paciente (id),
  CONSTRAINT fk_consulta_oftalmo  FOREIGN KEY (oftalmologo_id)   REFERENCES oftalmologo (id),
  CONSTRAINT fk_consulta_sede     FOREIGN KEY (sede_id)          REFERENCES sede (id),
  CONSTRAINT fk_consulta_tipo     FOREIGN KEY (tipo_consulta_id) REFERENCES tipo_consulta (id)
) ENGINE=InnoDB;

-- Adjuntos / estudios diagnósticos (RF2.4)
CREATE TABLE IF NOT EXISTS examen (
  id             BIGINT UNSIGNED  NOT NULL AUTO_INCREMENT,
  consulta_id    BIGINT UNSIGNED  NOT NULL,
  paciente_id    BIGINT UNSIGNED  NOT NULL,
  tipo_examen_id INT UNSIGNED NOT NULL,
  archivo_url    VARCHAR(255)      NOT NULL,
  nombre_archivo VARCHAR(200)      NULL,
  mime_type      VARCHAR(80)       NULL,
  descripcion    VARCHAR(500)      NULL,
  fecha          DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY ix_examen_consulta (consulta_id),
  KEY ix_examen_paciente_fecha (paciente_id, fecha),
  CONSTRAINT fk_examen_consulta FOREIGN KEY (consulta_id)    REFERENCES consulta (id)     ON DELETE CASCADE,
  CONSTRAINT fk_examen_paciente FOREIGN KEY (paciente_id)    REFERENCES paciente (id),
  CONSTRAINT fk_examen_tipo     FOREIGN KEY (tipo_examen_id) REFERENCES tipo_examen (id)
) ENGINE=InnoDB;

-- =============================================================================
--  SECCIÓN 7 · PROCEDIMIENTOS QUIRÚRGICOS  (RF4.4, pantalla 3.6.13)
--  Se declara ANTES de `tratamiento` porque `tratamiento` la referencia.
-- =============================================================================

CREATE TABLE IF NOT EXISTS cirugia (
  id                BIGINT UNSIGNED  NOT NULL AUTO_INCREMENT,
  paciente_id       BIGINT UNSIGNED  NOT NULL,
  oftalmologo_id    BIGINT UNSIGNED  NOT NULL,
  diagnostico_preop VARCHAR(500)     NULL,
  tipo_cirugia      VARCHAR(120)     NOT NULL COMMENT 'ej. Facofacización, LASIK, Trabeculectomía',
  ojo               INT UNSIGNED NULL,
  fecha_programada  DATE             NULL,
  fecha_realizada   DATE             NULL,
  anestesia         VARCHAR(60)      NULL,
  tecnica           TEXT             NULL,
  incidencias       TEXT             NULL,
  lente_intraocular VARCHAR(120)     NULL COMMENT 'Modelo de LIO / injerto',
  estado            VARCHAR(30)      NOT NULL DEFAULT 'PROGRAMADA',
  PRIMARY KEY (id),
  KEY ix_cirugia_paciente (paciente_id),
  KEY ix_cirugia_fecha (fecha_programada),
  CONSTRAINT fk_cirugia_paciente FOREIGN KEY (paciente_id)    REFERENCES paciente (id),
  CONSTRAINT fk_cirugia_oftalmo  FOREIGN KEY (oftalmologo_id) REFERENCES oftalmologo (id),
  CONSTRAINT fk_cirugia_ojo      FOREIGN KEY (ojo)            REFERENCES ojo (id)
) ENGINE=InnoDB;

-- =============================================================================
--  SECCIÓN 8 · TRATAMIENTOS Y SEGUIMIENTO  (RF-04)
-- =============================================================================

CREATE TABLE IF NOT EXISTS tratamiento (
  id               BIGINT UNSIGNED  NOT NULL AUTO_INCREMENT,
  paciente_id      BIGINT UNSIGNED  NOT NULL,
  oftalmologo_id   BIGINT UNSIGNED  NOT NULL,
  consulta_id      BIGINT UNSIGNED  NULL COMMENT 'Consulta que originó el tratamiento',
  tipo_id          INT UNSIGNED  NOT NULL,
  estado_id        INT UNSIGNED  NOT NULL,
  -- Medicamento / prescripción óptica
  medicamento      VARCHAR(150)     NULL COMMENT 'Nombre comercial o genérico',
  principio_activo VARCHAR(150)     NULL,
  dosis            VARCHAR(100)     NULL COMMENT 'ej. 1 gota',
  ojo              INT UNSIGNED NULL,
  frecuencia       VARCHAR(80)      NULL COMMENT 'ej. cada 8 horas',
  duracion         VARCHAR(80)      NULL COMMENT 'ej. 14 días',
  -- Procedimiento quirúrgico
  cirugia_id       BIGINT UNSIGNED  NULL,
  -- Plan
  fecha_inicio     DATE             NOT NULL,
  fecha_fin        DATE             NULL,
  fecha_control    DATE             NULL COMMENT 'Próxima cita de control (RF4.3)',
  indicaciones     TEXT             NULL,
  activo           TINYINT(1)       NOT NULL DEFAULT 1,
  fecha_creacion   DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY ix_trat_paciente_estado (paciente_id, estado_id),
  KEY ix_trat_oftalmo (oftalmologo_id),
  KEY ix_trat_vigente (activo, fecha_fin),
  CONSTRAINT fk_trat_paciente FOREIGN KEY (paciente_id)    REFERENCES paciente (id),
  CONSTRAINT fk_trat_oftalmo  FOREIGN KEY (oftalmologo_id) REFERENCES oftalmologo (id),
  CONSTRAINT fk_trat_consulta FOREIGN KEY (consulta_id)    REFERENCES consulta (id)     ON DELETE SET NULL,
  CONSTRAINT fk_trat_tipo     FOREIGN KEY (tipo_id)        REFERENCES tipo_tratamiento (id),
  CONSTRAINT fk_trat_estado   FOREIGN KEY (estado_id)      REFERENCES estado_tratamiento (id),
  CONSTRAINT fk_trat_ojo      FOREIGN KEY (ojo)            REFERENCES ojo (id),
  CONSTRAINT fk_trat_cirugia  FOREIGN KEY (cirugia_id)     REFERENCES cirugia (id)      ON DELETE SET NULL
) ENGINE=InnoDB;

-- Controles / seguimiento del tratamiento (RF4.5, pantalla 3.6.12)
CREATE TABLE IF NOT EXISTS control_tratamiento (
  id              BIGINT UNSIGNED  NOT NULL AUTO_INCREMENT,
  tratamiento_id  BIGINT UNSIGNED  NOT NULL,
  oftalmologo_id  BIGINT UNSIGNED  NULL COMMENT 'Oftalmólogo que realizó el control',
  fecha           DATE             NOT NULL,
  resultado       VARCHAR(80)      NULL COMMENT 'Completado / Mejora / Sin Cambios / Pendiente',
  pio_od          DECIMAL(5,2)     NULL,
  pio_oi          DECIMAL(5,2)     NULL,
  observaciones   TEXT             NULL,
  PRIMARY KEY (id),
  KEY ix_control_trat_fecha (tratamiento_id, fecha),
  CONSTRAINT fk_control_trat     FOREIGN KEY (tratamiento_id) REFERENCES tratamiento (id) ON DELETE CASCADE,
  CONSTRAINT fk_control_oftalmo  FOREIGN KEY (oftalmologo_id) REFERENCES oftalmologo (id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- =============================================================================
--  SECCIÓN 9 · AUDITORÍA  (RNF-01)
--  Bitácora de accesos y de cada consulta al historial clínico.
-- =============================================================================

CREATE TABLE IF NOT EXISTS auditoria (
  id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  usuario_id  BIGINT UNSIGNED NULL,
  username    VARCHAR(60)     NULL COMMENT 'Se denormaliza para conservar el rastro tras un borrado',
  accion      VARCHAR(60)     NOT NULL COMMENT 'LOGIN_OK, LOGIN_FAIL, VER_HISTORIAL, CREAR, ...',
  recurso     VARCHAR(60)     NULL COMMENT 'PACIENTE, CONSULTA, CITA, TRATAMIENTO, ...',
  recurso_id  BIGINT UNSIGNED NULL,
  descripcion VARCHAR(500)    NULL,
  ip_address  VARCHAR(45)     NULL,
  navegador   VARCHAR(120)    NULL,
  resultado   VARCHAR(30)     NOT NULL DEFAULT 'EXITOSO',
  fecha       DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY ix_auditoria_fecha (fecha),
  KEY ix_auditoria_usuario (usuario_id),
  KEY ix_auditoria_accion (accion),
  CONSTRAINT fk_auditoria_usuario FOREIGN KEY (usuario_id) REFERENCES usuario (id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- =============================================================================
--  SECCIÓN 10 · VISTAS DE SOPORTE
-- =============================================================================

CREATE OR REPLACE VIEW v_agenda_diaria AS
SELECT
  c.id                   AS cita_id,
  c.fecha,
  c.hora_inicio,
  c.hora_fin,
  c.consultorio,
  p.id                   AS paciente_id,
  CONCAT(p.nombres,' ',p.apellidos) AS paciente,
  p.documento,
  o.id                   AS oftalmologo_id,
  CONCAT(o.nombres,' ',o.apellidos) AS oftalmologo,
  s.nombre               AS subespecialidad,
  ec.codigo              AS estado,
  ec.nombre              AS estado_nombre,
  tc.nombre              AS tipo_consulta,
  c.motivo
FROM cita c
INNER JOIN paciente        p  ON p.id  = c.paciente_id
INNER JOIN oftalmologo     o  ON o.id  = c.oftalmologo_id
INNER JOIN subespecialidad s  ON s.id  = o.subespecialidad_id
INNER JOIN estado_cita     ec ON ec.id = c.estado_cita_id
LEFT  JOIN tipo_consulta   tc ON tc.id = c.tipo_consulta_id;

CREATE OR REPLACE VIEW v_historial_clinico AS
SELECT
  co.id,
  co.fecha,
  co.paciente_id,
  p.nombres,
  p.apellidos,
  p.documento,
  o.nombres  AS med_nombres,
  o.apellidos AS med_apellidos,
  tc.nombre  AS tipo_consulta,
  co.agudeza_od,
  co.agudeza_oi,
  co.pio_od,
  co.pio_oi,
  co.diagnostico,
  co.cie10,
  co.soap_subjetivo,
  co.soap_objetivo,
  co.soap_evaluacion,
  co.soap_plan
FROM consulta co
INNER JOIN paciente     p  ON p.id  = co.paciente_id
INNER JOIN oftalmologo   o  ON o.id  = co.oftalmologo_id
INNER JOIN tipo_consulta tc ON tc.id = co.tipo_consulta_id;

-- Serie temporal para la gráfica de presión intraocular (pantalla 3.6.4)
CREATE OR REPLACE VIEW v_evolucion_presion_intraocular AS
SELECT
  co.paciente_id,
  DATE(co.fecha) AS fecha,
  co.pio_od,
  co.pio_oi,
  co.agudeza_od,
  co.agudeza_oi,
  co.diagnostico
FROM consulta co
WHERE co.pio_od IS NOT NULL
   OR co.pio_oi IS NOT NULL;

-- =============================================================================
-- FIN DEL ESQUEMA
--  Cargar los datos de prueba con:  02_datos_prueba.sql
-- =============================================================================