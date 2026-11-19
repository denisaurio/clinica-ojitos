-- =============================================================================
--  V2 · Firma de la consulta y cirugía vinculada a consultas del historial
--
--  - consulta.firmada_en / firmada_por: el médico encargado firma la consulta;
--    firmada, ya no se modifica y sirve de respaldo para indicar una cirugía.
--  - cirugia_consulta: una cirugía se vincula a una o varias consultas
--    (firmadas) del mismo paciente.
--
--  Flyway la aplica sola al arrancar el backend (V1 = sql/01_esquema.sql).
--  Es idempotente: si una columna ya existe (p. ej. una base de desarrollo
--  creada con ddl-auto=update), no la vuelve a crear.
-- =============================================================================

-- Base vacía (desarrollo con ddl-auto=update): no hay nada que migrar.
SET @hay_tablas := (SELECT COUNT(*) = 2 FROM information_schema.TABLES
                    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME IN ('consulta', 'cirugia'));

SET @falta := (SELECT COUNT(*) = 0 FROM information_schema.COLUMNS
               WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'consulta' AND COLUMN_NAME = 'firmada_en');
SET @sql := IF(@hay_tablas AND @falta, 'ALTER TABLE consulta ADD COLUMN firmada_en DATETIME NULL', 'DO 0');
PREPARE paso FROM @sql;
EXECUTE paso;
DEALLOCATE PREPARE paso;

SET @falta := (SELECT COUNT(*) = 0 FROM information_schema.COLUMNS
               WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'consulta' AND COLUMN_NAME = 'firmada_por');
SET @sql := IF(@hay_tablas AND @falta, 'ALTER TABLE consulta ADD COLUMN firmada_por BIGINT UNSIGNED NULL', 'DO 0');
PREPARE paso FROM @sql;
EXECUTE paso;
DEALLOCATE PREPARE paso;

SET @falta := (SELECT COUNT(*) = 0 FROM information_schema.TABLE_CONSTRAINTS
               WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'consulta'
                 AND CONSTRAINT_NAME = 'fk_consulta_firmante');
SET @sql := IF(@hay_tablas AND @falta,
    'ALTER TABLE consulta ADD CONSTRAINT fk_consulta_firmante FOREIGN KEY (firmada_por) REFERENCES oftalmologo (id)',
    'DO 0');
PREPARE paso FROM @sql;
EXECUTE paso;
DEALLOCATE PREPARE paso;

SET @sql := IF(@hay_tablas,
    'CREATE TABLE IF NOT EXISTS cirugia_consulta ( cirugia_id  BIGINT UNSIGNED NOT NULL, consulta_id BIGINT UNSIGNED NOT NULL, PRIMARY KEY (cirugia_id, consulta_id), KEY ix_cirugia_consulta_consulta (consulta_id), CONSTRAINT fk_cc_cirugia  FOREIGN KEY (cirugia_id)  REFERENCES cirugia (id)  ON DELETE CASCADE, CONSTRAINT fk_cc_consulta FOREIGN KEY (consulta_id) REFERENCES consulta (id) ) ENGINE=InnoDB',
    'DO 0');
PREPARE paso FROM @sql;
EXECUTE paso;
DEALLOCATE PREPARE paso;
