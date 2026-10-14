-- =============================================================================
--  CLÍNICA OFTALMOLÓGICA OJITOS  ·  Cuentas iniciales
--  Script incremental · RF-06
--
--  Requisito previo:  01_esquema.sql  y  02_datos_prueba.sql
--
--  Este script crea la cuenta de administrador inicial solicitada para el
--  proyecto y garantiza que exista aunque la base se haya construido solo con
--  el esquema. Es idempotente: se puede ejecutar las veces que haga falta.
--
--  ⚠️  SEGURIDAD (RNF-01)
--  Credencial de DESARROLLO LOCAL únicamente.
--  Antes de cualquier despliegue real hay que cambiar esta contraseña.
-- =============================================================================

USE clinica_ojitos;

SET NAMES utf8mb4;

-- -----------------------------------------------------------------------------
--  Administrador inicial
--  usuario  : admin
--  contraseña: admin123
--  hash     : BCrypt("admin123") — verificado con BCryptPasswordEncoder.matches()
-- -----------------------------------------------------------------------------

-- Si el rol ADMINISTRADOR no existiera, se crea antes de insertar la cuenta.
INSERT INTO rol (codigo, nombre, descripcion)
VALUES ('ADMINISTRADOR', 'Administrador',
        'Control total del sistema, gestión de médicos, horarios y auditoría.')
ON DUPLICATE KEY UPDATE nombre = VALUES(nombre), descripcion = VALUES(descripcion);

SET @rol_admin = (SELECT id FROM rol WHERE codigo = 'ADMINISTRADOR');

-- Se elimina cualquier enlace previo para poder reinsertar la cuenta.
DELETE FROM usuario_oftalmologo WHERE usuario_id IN (SELECT id FROM usuario WHERE username = 'admin');

-- Alta de la cuenta o actualización de la contraseña si ya existía.
INSERT INTO usuario (username, password_hash, email, rol_id, activo, intentos_fallidos, fecha_creacion)
VALUES ('admin',
        '$2a$10$vBW4aY79kArBAkbLGkkskOwL5vm1cnVeAL/bDeddG.r7goZngWC/m',
        'admin@clinicaojitos.pe',
        @rol_admin,
        1,
        0,
        NOW())
ON DUPLICATE KEY UPDATE
    password_hash   = VALUES(password_hash),
    rol_id          = VALUES(rol_id),
    activo          = 1,
    intentos_fallidos = 0,
    email           = VALUES(email);

-- -----------------------------------------------------------------------------
--  Cuentas de los profesionales de demostración
--
--  Este script se puede ejecutar SIN 02_datos_prueba.sql: crea también las
--  cuentas del resto de roles, para que el login del sistema tenga sentido
--  desde el primer arranque. Si existen los médicos del seed, se enlazan.
--
--  Todos usan BCrypt("Ojitos2026*").
-- -----------------------------------------------------------------------------

INSERT INTO rol (codigo, nombre, descripcion) VALUES
  ('OFTALMOLOGO','Oftalmólogo','Profesional tratante: consultas, diagnósticos y tratamientos.'),
  ('RECEPCIONISTA','Recepcionista','Admisión de pacientes, agenda de citas y triaje.'),
  ('PACIENTE','Paciente','Acceso de solo lectura a su propia información clínica.')
ON DUPLICATE KEY UPDATE nombre = VALUES(nombre), descripcion = VALUES(descripcion);

-- El hash BCrypt compartido de "Ojitos2026*"
SET @hash_demo = '$2a$10$A0dcDmz59HQ2Gj7DsWNp/.lhQ8h.cA/biTvsKk8dB0jO.hqq7pqDW';

SET @rol_oftalmo = (SELECT id FROM rol WHERE codigo = 'OFTALMOLOGO');
SET @rol_recepcion = (SELECT id FROM rol WHERE codigo = 'RECEPCIONISTA');
SET @rol_paciente = (SELECT id FROM rol WHERE codigo = 'PACIENTE');

-- -----------------------------------------------------------------------------
--  Cuenta del paciente
--
--  La cuenta se enlaza con la ficha por el CORREO, así que hay que usar el
--  que exista realmente en `paciente`. Si la base tiene un paciente propio y no
--  el del seed, la cuenta debe apuntar a ese: si no, el portal responde 404.
-- -----------------------------------------------------------------------------
SET @correo_paciente = COALESCE(
    (SELECT p.email FROM paciente p
      WHERE p.email IS NOT NULL AND TRIM(p.email) <> ''
      ORDER BY p.id LIMIT 1),
    'maria.gonzalez@email.com');

INSERT INTO usuario (username, password_hash, email, rol_id, activo, intentos_fallidos, fecha_creacion) VALUES
  ('recepcion',  @hash_demo, 'recepcion@clinicaojitos.pe', @rol_recepcion, 1, 0, NOW()),
  ('paciente',   @hash_demo, @correo_paciente,             @rol_paciente,  1, 0, NOW())
ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash),
                            rol_id = VALUES(rol_id),
                            activo = 1,
                            intentos_fallidos = 0,
                            -- Si la ficha cambió de correo, la cuenta se reengancha.
                            email = IF(VALUES(username) = 'paciente', VALUES(email), email);

-- Las cuentas de los oftalmólogos se crean una vez existen los profesionales
-- (lo hace el propio script 02 al dar de alta a los médicos).
INSERT INTO usuario (username, password_hash, email, rol_id, activo, intentos_fallidos, fecha_creacion)
SELECT u.username, @hash_demo, u.email, @rol_oftalmo, 1, 0, NOW()
FROM usuario_oftalmologo uo
INNER JOIN usuario u ON u.id = uo.usuario_id
ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash), rol_id = VALUES(rol_id),
                            intentos_fallidos = 0;

-- -----------------------------------------------------------------------------
--  Verificación
-- -----------------------------------------------------------------------------
SELECT
    u.id,
    u.username,
    u.email,
    r.nombre  AS rol,
    u.activo,
    u.intentos_fallidos,
    CASE WHEN u.password_hash = '$2a$10$vBW4aY79kArBAkbLGkkskOwL5vm1cnVeAL/bDeddG.r7goZngWC/m'
         THEN 'configurada'
         ELSE 'revisar' END AS estado_clave
FROM usuario u
INNER JOIN rol r ON r.id = u.rol_id
WHERE u.username = 'admin';

-- Cuentas de demostración disponibles tras 02_datos_prueba.sql
SELECT
    u.username,
    r.nombre AS rol,
    CASE
        WHEN u.password_hash = '$2a$10$A0dcDmz59HQ2Gj7DsWNp/.lhQ8h.cA/biTvsKk8dB0jO.hqq7pqDW'
        THEN 'Ojitos2026*'
        ELSE 'clave propia'
    END AS clave
FROM usuario u
INNER JOIN rol r ON r.id = u.rol_id
ORDER BY r.id, u.username;

-- =============================================================================
--  FIN DEL SCRIPT
-- =============================================================================