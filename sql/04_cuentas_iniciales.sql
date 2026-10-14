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