-- =============================================================================
--  CLÍNICA OFTALMOLÓGICA OJITOS  ·  Cambiar el rol de un usuario
--  Script incremental · RF-06
--
--  Requisito previo:  01_esquema.sql
--
--  Uso:
--    1. Edita solo las tres variables de la sección "CONFIGURACIÓN".
--    2. Ejecuta el script completo.
--
--  Es idempotente: si el usuario ya tiene ese rol, no cambia nada.
-- =============================================================================

USE clinica_ojitos;

SET NAMES utf8mb4;

-- La base se creó con utf8mb4_unicode_ci, pero MySQL 8 arranca las conexiones
-- con utf8mb4_0900_ai_ci. Al comparar una variable de sesión contra una columna
-- eso provoca «Illegal mix of collations», así que se iguala aquí.
SET collation_connection = 'utf8mb4_unicode_ci';

-- =============================================================================
--  CONFIGURACIÓN — edita esto
-- =============================================================================
SET @usuario_objetivo = 'recepcion';          -- el username, sin el @
SET @nuevo_rol       = 'RECEPCIONISTA';       -- el código del rol

-- =============================================================================

-- -----------------------------------------------------------------------------
--  1. Roles disponibles
-- -----------------------------------------------------------------------------
SELECT codigo, nombre, descripcion
FROM rol
ORDER BY id;

-- Si el código que has puesto arriba no existe, el script se detiene aquí con un
-- error claro en lugar de dejar al usuario sin rol.
SET @rol_id = (SELECT id FROM rol WHERE codigo = @nuevo_rol);

SELECT
    CASE
        WHEN @rol_id IS NULL THEN 'ERROR: el rol "' + @nuevo_rol + '" no existe — no se cambió nada'
        ELSE 'OK: "' + @nuevo_rol + '" tiene el id ' + @rol_id
    END AS validacion_rol;

-- Si @rol_id es NULL, el UPDATE de abajo no hace nada: el filtro
-- `AND @rol_id IS NOT NULL` lo neutraliza. Así un código mal escrito no
-- deja a nadie sin rol.

-- -----------------------------------------------------------------------------
--  2. Estado actual del usuario
-- -----------------------------------------------------------------------------
SELECT
    u.id,
    u.username,
    u.email,
    r.codigo AS rol_actual,
    r.nombre  AS nombre_rol,
    u.activo,
    u.intentos_fallidos
FROM usuario u
INNER JOIN rol r ON r.id = u.rol_id
WHERE u.username = @usuario_objetivo;

-- -----------------------------------------------------------------------------
--  3. Safeguarda: no dejar la clínica sin administrador
--
--  Si se está degradando al ÚLTIMO administrador, el script se cancela. Sin
--  esto, un cambio de rol sin querer dejaría el sistema sin nadie que pueda
--  volver a asignar los roles.
-- -----------------------------------------------------------------------------
SET @es_admin_actual =
    (SELECT COUNT(*) FROM usuario u INNER JOIN rol r ON r.id = u.rol_id
      WHERE r.codigo = 'ADMINISTRADOR' AND u.activo = 1);

SET @target_es_admin =
    (SELECT COUNT(*) FROM usuario u INNER JOIN rol r ON r.id = u.rol_id
      WHERE u.username = @usuario_objetivo AND r.codigo = 'ADMINISTRADOR' AND u.activo = 1);

SET @quedan_admins =
    @es_admin_actual - @target_es_admin + IF(@nuevo_rol = 'ADMINISTRADOR', 1, 0);

SELECT
    CASE
        WHEN @quedan_admins < 1
            THEN 'ATENCIÓN: este cambio dejaría la clínica sin administrador. Se cancelará.'
        ELSE 'OK: quedarían ' + @quedan_admins + ' administrador(es) activo(s)'
    END AS validacion_admin;

-- Solo aplica el cambio si existe el rol y queda al menos un administrador.
UPDATE usuario u
INNER JOIN rol r ON r.id = @rol_id
SET u.rol_id = r.id,
    -- Al cambiar de rol se reinicia el bloqueo: la persona sigue siendo la
    -- misma, solo tiene ahora permisos y un panel distintos.
    u.intentos_fallidos = 0
WHERE u.username = @usuario_objetivo
  AND @rol_id IS NOT NULL
  AND @quedan_admins >= 1;

SELECT ROW_COUNT() AS filas_modificadas;

-- -----------------------------------------------------------------------------
--  4. Resultado
-- -----------------------------------------------------------------------------
SELECT
    u.id,
    u.username,
    u.email,
    r.codigo AS rol_actual,
    r.nombre  AS nombre_rol,
    u.activo
FROM usuario u
INNER JOIN rol r ON r.id = u.rol_id
WHERE u.username = @usuario_objetivo;

-- =============================================================================
--  REFERENCIA DE CÓDIGOS
-- -----------------------------------------------------------------------------
--  ADMINISTRADOR   Control total: médicos, horarios, sedes y auditoría.
--  OFTALMOLOGO     Profesional tratante: consultas, diagnósticos y tratamientos.
--  RECEPCIONISTA    Admisión de pacientes, agenda de citas y triaje.
--                   No accede al historial clínico.
--  PACIENTE        Solo lectura de su propia información clínica.
--
--  Para crear un rol nuevo basta con insertarlo; no hay que modificar el
--  esquema porque los roles son una tabla de catálogo (RNF-05):
--    INSERT INTO rol (codigo, nombre, descripcion)
--    VALUES ('SUPERVISOR', 'Supervisor', 'Coordina la agenda del turno.');
-- =============================================================================