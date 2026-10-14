-- =============================================================================
--  CLÍNICA OFTALMOLÓGICA OJITOS  ·  Sedes y universidades del Perú
--  Script incremental · Catálogo de referencia
--  Requisito previo:  01_esquema.sql
--
--  Permite elegir la sede de un profesional de una lista de universidades
--  Peruvianas con buscador, o escribir libremente una que no esté en la lista.
--  Es idempotente: se puede ejecutar las veces que haga falta.
-- =============================================================================

USE clinica_ojitos;

SET NAMES utf8mb4;

-- -----------------------------------------------------------------------------
--  Sedes frecuentes
--  Se incluyen las universidades Peruvianas de mayor presencia y las que suelen
--  ser citadas por profesionales de la salud. La lista es orientativa: el
--  formulario de alta permite escribir CUALQUIER otra que no esté aquí.
-- -----------------------------------------------------------------------------
INSERT INTO sede (nombre, direccion, telefono, activo) VALUES
  ('Universidad Nacional Mayor de San Marcos (UNMSM)',             'Av. Universitario 1500, San Miguel',   '(01) 452-0900', 1),
  ('Universidad Nacional Federico Villarreal (UNFV)',              'Av. Iquitos 1100, La Victoria',       '(01) 350-9000', 1),
  ('Universidad Nacional de San Antonio Abad del Cusco (UNSAAC)', 'Puno 620, Cusco',                      '(084) 231-361', 1),
  ('Universidad Nacional de San Agustín (UNSA)',                  'San Agustín 367, Arequipa',            '(054) 210-006', 1),
  ('Universidad Nacional de San Pedro (UNSP)',                    'Jr. Sachaca 115, Piura',               '(079) 340-570', 1),
  ('Universidad Nacional de Trujillo (UNT)',                       'Av. España 231, Trujillo',             '(044) 310-041', 1),
  ('Universidad Nacional de Cajamarca (UNC)',                     'Av. Universidad 601, Cajamarca',        '(076) 513-227', 1),
  ('Universidad Nacional de San Martín (UNSM)',                   'Los Bolivarianos 611, Tarapoto',       '(052) 583-080', 1),
  ('Universidad Nacional de San Antonio Abad de Huancayo',        'Jr. Landaeta 276, Huancayo',           '(067) 361-130', 1),
  ('Universidad Nacional de Juliaca (UNJ)',                       'Av. Francisco quinoa 804, Juliaca',     '(064) 422-141', 1),
  ('Universidad Nacional de Puno (UNAP)',                         'Av. Elmer FRAYLE 201, Puno',            '(025) 393-602', 1),
  ('Universidad Nacional de Piura (UNPI)',                        'Av. Los Ejércitos 1000, Piura',        '(079) 317-520', 1),
  ('Universidad Nacional de Chimborazo',                          'Av. Nicolás de Piérola 350, Huancayo',  '(067) 451-076', 1),
  ('Universidad Nacional de la Amazonía Peruana',                 'Av. Porvenir 100, Iquitos',            '(065) 601-221', 1),
  ('Universidad Ricardo Palma (URP)',                             'Av. Javier Prado Este 2661, Surquillo','(01) 273-9000', 1),
  ('Universidad César Vallejo (UCV)',                             'Av. Los Pezuelos 2113, Trujillo',       '(044) 205-000', 1),
  ('Universidad Privada del Norte (UPN)',                        'Av. España 1420, Trujillo',             '(044) 315-400', 1),
  ('Universidad Alas Peruanas (UAP)',                             'Av. Venezuela 1301, Jesús María',       '(01) 348-0900', 1),
  ('Universidad San Martín de Porres (USMP)',                     'Av. San Martín 550, Jesús María',      '(01) 219-0500', 1),
  ('Universidad Nacional de Ingeniería (UNI)',                    'Av. Túpac Amaru 210, Rímac',           '(01) 481-1000', 1),
  ('Universidad de Ingeniería y Tecnología (UNIT)',               'Av. El Sol 500, Surquillo',            '(01) 484-9000', 1),
  ('Universidad de Ciencias y Artes de América Latina (UCAL)',    'Av. La Paz 225, Miraflores',           '(01) 221-6100', 1),
  ('Universidad del Pacífico (UP)',                              'Av. Salaverry 225, Miraflores',        '(01) 611-1100', 1),
  ('Universidad Antonio Ruiz de Montoya (UARM)',                  'Av. Bolívar 800, Jesús María',          '(01) 349-0900', 1),
  ('Universidad Peruana de Ciencias Aplicadas (UPCA)',            'Av. Monterrey 210, Surquillo',          '(01) 353-8000', 1),
  ('Universidad Nacional de Educación Enrique Guzmán y Valle',    'Los Heroicos 200, Chosica',            '(01) 481-0900', 1),
  ('Universidad Científica del Sur (UCS)',                         'Av. Bolivar 900, Miraflores',           '(01) 610-0700', 1),
  ('Universidad Nacional de Telecomunicaciones (UNT)',             'San Marcos 401, Lima',                 '(01) 428-7000', 1),
  ('Universidad Nacional de San Martín de Porres (UNSM-UNIV)',   'San Martín 555, Jesús María',          '(01) 219-0500', 1),
  ('Universidad Nacional de la Amazonía del Norte (UNAP)',        'Av. Principal 113, Yurimaguas',        '(065) 500-001', 1),
  ('Instituto Nacional de Salud del Niño (INSN)',                'Av. Brasil 600, Magdalena, Lima',      '(01) 330-6000', 1),
  ('Hospital Nacional Guillermo Almenara (HNGA)',                 'Av. Luis Caravedo 2170, La Victoria',  '(01) 331-1000', 1),
  ('Hospital Regional de Ica (HRI)',                              'Av. Salvador 240, Ica',                '(056) 210-020', 1),
  ('Clínica Privada',                                            NULL,                                 NULL,           1),
  ('Consultorio Particular',                                      NULL,                                 NULL,           1),
  ('Otro',                                                       NULL,                                 NULL,           1)
ON DUPLICATE KEY UPDATE direccion = COALESCE(VALUES(direccion), direccion),
                        telefono  = COALESCE(VALUES(telefono), telefono);

-- -----------------------------------------------------------------------------
--  Verificación
-- -----------------------------------------------------------------------------
SELECT COUNT(*) AS total_sedes FROM sede;

SELECT nombre FROM sede ORDER BY nombre;