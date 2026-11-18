/**
 * Contrato estático entre backend, frontend y variables de entorno.
 *
 * Estas pruebas no tocan la red: leen el código y fallan si una ruta, un campo
 * o una variable que las pantallas necesitan desaparece del repositorio.
 */
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { asegurar } from '../lib/assert.mjs';
import { config } from '../lib/config.mjs';

const RUTA_ENV = '.env.example';
const RUTA_APP = 'backend/src/main/resources/application.yml';
const RUTA_DEV = 'backend/src/main/resources/application-dev.yml';
const RUTA_CITA_CONTROLLER =
  'backend/src/main/java/com/clinicaojitos/controller/CitaController.java';
const RUTA_CATALOGO_CONTROLLER =
  'backend/src/main/java/com/clinicaojitos/controller/CatalogoController.java';
const RUTA_OFTA_DTO =
  'backend/src/main/java/com/clinicaojitos/domain/dto/OftalmologoDto.java';
const RUTA_CITA_DTO = 'backend/src/main/java/com/clinicaojitos/domain/dto/CitaDto.java';
const RUTA_CITA_SERVICE = 'frontend/src/app/core/services/cita.service.ts';
const RUTA_TRATAMIENTO_SERVICE = 'frontend/src/app/core/services/tratamiento.service.ts';
const RUTA_OFTA_SERVICE = 'frontend/src/app/core/services/oftalmologo.service.ts';
const RUTA_RUNTIME_ENV = 'frontend/src/environments/runtime-env.ts';
const RUTA_ENV_JS = 'frontend/public/env.js';
const RUTA_INDEX = 'frontend/src/index.html';
const RUTA_NUEVO_PACIENTE = 'frontend/src/app/features/pacientes/nuevo.ts';
const RUTA_HISTORIAL_SERVICE = 'frontend/src/app/core/services/historial.service.ts';
const RUTA_NUEVA_CONSULTA = 'frontend/src/app/features/historial/nueva-consulta.ts';
const RUTA_CITA_REPOSITORY =
  'backend/src/main/java/com/clinicaojitos/domain/repository/CitaRepository.java';

export default {
  nombre: 'contrato',
  async ejecutar({ prueba }) {
    const raiz = config.raizRepo;

    const leer = (relativa) => {
      const ruta = path.join(raiz, relativa);
      asegurar(existsSync(ruta), `falta el archivo ${relativa}`);
      return readFileSync(ruta, 'utf8');
    };

    const contiene = (relativa, fragmento, mensaje) => {
      const texto = leer(relativa);
      asegurar(
        texto.includes(fragmento),
        `${relativa} perdió ${JSON.stringify(fragmento)} (${mensaje})`
      );
      return texto;
    };

    await prueba('El .env.example declara todas las variables de despliegue', () => {
      const claves = [
        'TZ',
        'APP_TIMEZONE',
        'APP_DOMAIN',
        'APP_URL',
        'MYSQL_DATABASE',
        'MYSQL_USER',
        'MYSQL_PASSWORD',
        'MYSQL_ROOT_PASSWORD',
        'DB_URL',
        'DB_USER',
        'DB_PASSWORD',
        'DB_POOL_MAX',
        'DB_POOL_MIN',
        'SERVER_PORT',
        'SPRING_PROFILES_ACTIVE',
        'JPA_DDL_AUTO',
        'JWT_SECRET',
        'JWT_EXPIRATION_MINUTES',
        'CORS_ALLOWED_ORIGINS',
        'LOG_LEVEL_ROOT',
        'LOG_LEVEL_APP',
        'MULTIPART_MAX_FILE',
        'FRONTEND_PORT',
        'API_PROXY_TARGET',
        'PRODUCTION',
        'USE_MOCK_API',
        'API_URL',
        'APP_NAME',
        'APP_TAGLINE',
      ];
      const contenido = leer(RUTA_ENV);
      const faltantes = claves.filter((clave) => !new RegExp(`^${clave}=`, 'm').test(contenido));
      asegurar(
        faltantes.length === 0,
        `faltan variables en ${RUTA_ENV}: ${faltantes.join(', ')}`
      );
    });

    await prueba('El .env real está ignorado y la plantilla no', () => {
      const gitignore = leer('.gitignore');
      asegurar(/^\.env$/m.test(gitignore), '.gitignore debe ignorar .env');
      asegurar(
        /^!\.env\.example$/m.test(gitignore),
        '.gitignore debe permitir versionar .env.example'
      );
    });

    await prueba('Spring Boot lee base de datos, JWT y CORS desde el entorno', () => {
      contiene(RUTA_APP, 'url: ${DB_URL', 'URL JDBC');
      contiene(RUTA_APP, 'username: ${DB_USER', 'usuario de base de datos');
      contiene(RUTA_APP, 'password: ${DB_PASSWORD', 'contraseña de base de datos');
      contiene(RUTA_APP, 'secret: ${JWT_SECRET', 'firma JWT');
      contiene(RUTA_APP, 'allowed-origins: ${CORS_ALLOWED_ORIGINS', 'orígenes CORS');
      contiene(RUTA_APP, 'port: ${SERVER_PORT', 'puerto del servidor');
    });

    await prueba('El perfil de desarrollo también es configurable', () => {
      contiene(RUTA_DEV, 'ddl-auto: ${JPA_DDL_AUTO', 'DDL automático');
      contiene(RUTA_DEV, 'expiration-minutes: ${JWT_EXPIRATION_MINUTES', 'expiración del token');
      contiene(RUTA_DEV, 'maximum-pool-size: ${DB_POOL_MAX', 'pool de conexiones');
    });

    await prueba('Angular usa configuración de ejecución, no URLs compiladas', () => {
      contiene(RUTA_RUNTIME_ENV, 'appUrl', 'URL pública usada en los enlaces al paciente');
      contiene(RUTA_ENV_JS, 'window.__env', 'objeto de configuración runtime');
      contiene(RUTA_ENV_JS, 'apiUrl', 'URL de la API en runtime');
      contiene(RUTA_INDEX, 'env.js', 'la página debe cargar env.js antes del bundle');
      contiene(RUTA_NUEVO_PACIENTE, 'environment.appUrl', 'enlace de acceso del paciente');
    });

    await prueba('GET /citas ya no expone la agenda al rol PACIENTE', () => {
      const controller = leer(RUTA_CITA_CONTROLLER);
      const antesDeAgenda = controller.split('public List<CitaDto.Evento> agenda')[0];
      const anotacion = antesDeAgenda.slice(-400);
      asegurar(
        !anotacion.includes('PACIENTE'),
        'la agenda general (GET /citas) volvió a permitir PACIENTE'
      );
      asegurar(
        anotacion.includes("@PreAuthorize(\"hasAnyRole('ADMINISTRADOR','RECEPCIONISTA','OFTALMOLOGO')\")"),
        'la agenda general debe exigir ADMINISTRADOR, RECEPCIONISTA u OFTALMOLOGO'
      );
    });

    await prueba('La agenda acepta el rango desde/hasta', () => {
      const controller = leer(RUTA_CITA_CONTROLLER);
      asegurar(
        controller.includes('@DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate desde'),
        'GET /citas perdió el parámetro desde'
      );
      asegurar(
        controller.includes('@DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate hasta'),
        'GET /citas perdió el parámetro hasta'
      );
    });

    await prueba('Los catálogos de horarios y estados están publicados', () => {
      contiene(RUTA_CATALOGO_CONTROLLER, '"/tipos-bloque"', 'tipos de bloque horario');
      contiene(RUTA_CATALOGO_CONTROLLER, '"/estados-tratamiento"', 'estados de tratamiento');
      contiene(RUTA_CATALOGO_CONTROLLER, '"/dias-semana"', 'días de la semana');
    });

    await prueba('La matriz de horarios devuelve códigos estables', () => {
      contiene(RUTA_OFTA_DTO, 'diaSemanaCodigo', 'código LUN..DOM');
      contiene(RUTA_OFTA_DTO, 'tipoBloqueCodigo', 'código CONSULTA/CIRUGIA/DESCANSO');
      contiene(RUTA_OFTA_DTO, 'satisfaccionMedia', 'métrica del panel del médico');
    });

    await prueba('La cita devuelve los campos que pinta la agenda', () => {
      contiene(RUTA_CITA_DTO, 'tipoConsultaId', 'tipo de consulta');
      contiene(RUTA_CITA_DTO, 'notaInterna', 'nota interna');
      contiene(RUTA_CITA_DTO, 'ocupaAgenda', 'bloqueo de la franja');
    });

    await prueba('El servicio de citas habla el contrato real', () => {
      contiene(RUTA_CITA_SERVICE, "params.set('desde'", 'parámetro desde');
      contiene(RUTA_CITA_SERVICE, "params.set('hasta'", 'parámetro hasta');
      contiene(RUTA_CITA_SERVICE, 'tipoConsultaId', 'tipo de consulta al crear');
      contiene(RUTA_CITA_SERVICE, 'notaInterna', 'nota interna al crear');
      contiene(RUTA_CITA_SERVICE, 'ultimaCita', 'cita creada para la confirmación');
    });

    await prueba('El servicio de tratamientos usa tipoId/estadoId y cirugías', () => {
      contiene(RUTA_TRATAMIENTO_SERVICE, 'tipoId', 'tipo de tratamiento');
      contiene(RUTA_TRATAMIENTO_SERVICE, 'estadoId', 'estado del tratamiento');
      contiene(RUTA_TRATAMIENTO_SERVICE, 'ojoId', 'lateralidad de la cirugía');
      contiene(RUTA_TRATAMIENTO_SERVICE, '/cirugias', 'recurso de cirugías');
      contiene(RUTA_TRATAMIENTO_SERVICE, '/controles', 'controles de seguimiento');
    });

    await prueba('El servicio de oftalmólogos traduce métricas y horarios', () => {
      contiene(RUTA_OFTA_SERVICE, 'satisfaccionMedia', 'métrica del backend');
      contiene(RUTA_OFTA_SERVICE, 'valoracionMedia', 'modelo de la pantalla');
      contiene(RUTA_OFTA_SERVICE, 'diaSemanaCodigo', 'día del bloque');
      contiene(RUTA_OFTA_SERVICE, 'tipoBloqueCodigo', 'tipo del bloque');
    });

    await prueba('Registrar consulta envía tipoConsultaId (RF-02)', () => {
      // ConsultaDto.Request exige @NotNull tipoConsultaId: sin él el alta da 400.
      contiene(RUTA_HISTORIAL_SERVICE, 'tipoConsultaId', 'id del tipo de consulta');
      contiene(RUTA_NUEVA_CONSULTA, 'valor: String(i.id)', 'el select debe guardar el id');
    });

    await prueba('El cruce de horario compara el rango completo (RF3.2)', () => {
      contiene(RUTA_CITA_REPOSITORY, 'c.horaInicio < :horaFin', 'solapamiento por rango');
      contiene(RUTA_CITA_REPOSITORY, 'c.horaFin    > :horaInicio', 'solapamiento por rango');
    });

    await prueba('spring.profiles.default está al nivel correcto', () => {
      const yml = leer(RUTA_APP);
      asegurar(
        /^spring:\n(?:.*\n)*?  profiles:\n    default:/m.test(yml.replace(/\r/g, '')),
        'spring.profiles.default debe colgar de spring:, no de spring.application:'
      );
    });
  },
};
