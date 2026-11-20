# Backend — Clínica Oftalmológica Ojitos

API REST en **Spring Boot 3.4 + Java 21** con persistencia en **MySQL 8**
mediante JPA/Hibernate.

La documentación completa del proyecto (instalación, rutas de aprendizaje,
referencia de la API) está en el [`README.md` raíz](../README.md). La
descripción carpeta por carpeta está en
[`docs/ESTRUCTURA.md`](../docs/ESTRUCTURA.md), el recorrido por pantalla en
[`docs/FLUJO.md`](../docs/FLUJO.md) y el tutorial de publicación en
[`docs/DESPLIEGUE.md`](../docs/DESPLIEGUE.md).

---

## Cómo se ejecuta

```bash
# Variables de entorno: nunca se versionan credenciales
export DB_URL='jdbc:mysql://localhost:3306/clinica_ojitos?useSSL=false&allowPublicKeyRetrieval=true&serverTimezone=America/Lima'
export DB_USER=root
export DB_PASSWORD=tu_clave
export JWT_SECRET="$(openssl rand -base64 48)"

# bash / Git Bash
./mvnw spring-boot:run

# PowerShell (Windows): el prefijo .\ es obligatorio, PowerShell no ejecuta
# archivos de la carpeta actual sin él
.\mvnw.cmd spring-boot:run

# o simplemente, si ya tienes Maven en el sistema
mvn spring-boot:run
```

Queda disponible en `http://localhost:8080`:

| Ruta | Qué es |
|---|---|
| `/api/v1/estado` | Verificación de que la API está viva (pública) |
| `/swagger-ui.html` | Documentación interactiva de todos los endpoints |
| `/v3/api-docs` | Especificación OpenAPI en JSON |

```bash
mvnw test              # 53 pruebas JUnit (25 unitarias + 28 de API con H2)
mvnw clean test        # compila desde cero y ejecuta las pruebas
```

> **Requiere `JAVA_HOME` válido.** Si Maven responde *«JAVA_HOME no está
> definido correctamente»*, la variable apunta a una carpeta que no existe.
> Compruébalo con `$env:JAVA_HOME` y `java -version`.

---

## Arquitectura en capas

```
Controller  →  Service  →  Repository  →  Entity
  (HTTP)       (reglas)     (JPQL)       (JPA)
```

La regla que sostiene todo el diseño: **la lógica de negocio vive en
`service/` y los controladores no deciden nada.** Un controlador valida la
entrada, delega y devuelve. Si alguna vez necesitas escribir un `if` de reglas
de negocio dentro de un controlador, va en el servicio.

Dos capas transversales:

- **`exception/GlobalExceptionHandler`** — traduce cada excepción de negocio a
  una respuesta HTTP coherente. Es el único lugar que construye errores.
- **`audit/`** — registra en la tabla `auditoria` toda operación sensible
  (RFNF-01).

---

## Estructura

```
src/main/java/com/clinicaojitos/
├── config/            SecurityConfig, OpenApiConfig, DatosIniciales
├── security/          JwtService, filtro JWT, guards, registro de intentos
├── domain/
│   ├── entity/        25 entidades JPA
│   ├── repository/    24 repositorios (JPQL)
│   ├── service/       9 servicios — las reglas de negocio
│   └── dto/           9 archivos de `record` inmutables
├── controller/        10 controladores REST
├── exception/         Excepciones de negocio + manejador global
└── audit/             Aspecto y servicio de auditoría
```

---

## Convenciones

| Elemento | Regla |
|---|---|
| Paquete raíz | `com.clinicaojitos` |
| Nombres | Español para el dominio, inglés para lo técnico |
| DTOs | `record` inmutables; **nunca** se devuelve una entidad JPA |
| Excepciones | Una clase propia por regla de negocio, en `exception/` |
| Transacciones | `@Transactional` en los servicios que modifican datos |
| Consultas | JPQL por defecto; SQL nativo solo si se justifica |
| Imports | Explícitos, nunca comodines |

Devolver una entidad JPA directamente desde un controlador está prohibido: acopla
la API al esquema y filtra datos por error. El `Mapeador` existe justo para eso.

---

## Puntos donde conviene mirar primero

Estos son los cinco sitios donde vive lo importante del proyecto:

**1. Las reglas de negocio** — `domain/service/`

**2. La seguridad** — `security/`

Dos detalles que no son evidentes y que costaron errores reales:

- **El JWT nunca lleva datos clínicos.** Solo `sub`, `uid`, `rol` y
  caducidad. El token viaja en el navegador; si llevara información del
  paciente, una fuga expondría datos sanitarios.
- **El contador de intentos usa `REQUIRES_NEW`** (`RegistroAccesoService`). Al
  fallar una contraseña, `AuthService` incrementa el contador y *después* lanza
  la excepción. Como esa excepción revierte la transacción, el incremento
  desaparecería y la cuenta nunca se bloquearía. Por eso va en su propia
  transacción.

**3. El manejo de errores** — `exception/`

Cada excepción escribe un mensaje pensado para un humano: es el texto que el
frontend muestra junto al campo del formulario.

**4. Las entidades** — `domain/entity/`

`pioOd` y `pioOi` son `BigDecimal`, no `double`. En la base la presión
intraocular es `DECIMAL(5,2)` —un decimal exacto en mmHg— y Hibernate rechaza
el arranque si el tipo Java no coincide. El `Mapeador` lo convierte a `Double`
solo al salir hacia la API.

**5. Las pruebas** — `../testing/backend/java/`

Son la mejor documentación ejecutable: cada prueba explica una regla de
negocio con un ejemplo. `CitaServiceTest` es la más informativa porque cubre
el cruce de horarios, la cancelación y la reprogramación. El `pom.xml` apunta
`testSourceDirectory` a esa carpeta, así que `mvnw test` las descubre sin
configuración extra. Las de `integracion/` usan Spring + H2 y no necesitan
MySQL; el detalle está en [`../testing/README.md`](../testing/README.md).

---

## Configuración

Todo se lee de variables de entorno con valores por defecto de desarrollo. La
lista completa, con ejemplos y comentarios, está en
[`../.env.example`](../.env.example).

| Variable | Por defecto | Para qué |
|---|---|---|
| `DB_URL` | `jdbc:mysql://localhost:3306/clinica_ojitos?...` | Cadena de conexión |
| `DB_USER` | `root` | Usuario de MySQL |
| `DB_PASSWORD` | *(vacío)* | Clave de MySQL |
| `DB_POOL_MAX` / `DB_POOL_MIN` | `10` / `2` | Tamaño del pool HikariCP |
| `JWT_SECRET` | *(vacío → aleatoria)* | Firma de los tokens (mínimo 32 caracteres) |
| `JWT_EXPIRATION_MINUTES` | `60` | Vigencia del token |
| `CORS_ALLOWED_ORIGINS` | *(vacío)* | Orígenes permitidos; vacío en producción |
| `DATA_ENCRYPTION_KEY` | *(vacío → sin cifrado)* | Clave AES-256 en Base64 que cifra los textos clínicos en la base (RNF-01) |
| `APP_URL` | *(vacío)* | Dirección pública de la web; con ella se arman los enlaces de los correos |
| `SMTP_HOST` / `SMTP_PORT` | *(vacío)* / `587` | Servidor de correo (RF3.5 avisos de citas, RF6.4 recuperación). Vacío → no se envían correos |
| `SMTP_USER` / `SMTP_PASSWORD` | *(vacío)* | Cuenta SMTP (en Gmail, contraseña de aplicación) |
| `SMTP_AUTH` / `SMTP_STARTTLS` / `SMTP_SSL` | `true` / `true` / `false` | Modo de conexión (465 → `SMTP_SSL=true`, `SMTP_STARTTLS=false`) |
| `MAIL_FROM` | *(SMTP_USER)* | Remitente visible |
| `ADMIN_USERNAME` / `ADMIN_PASSWORD` | *(vacío)* | Cuenta ADMINISTRADOR que se crea al arrancar si no existe (`config/AdministradorInicial`) |
| `ADMIN_EMAIL` | *(usuario@clinicaojitos.pe)* | Correo de esa cuenta |
| `ADMIN_FORZAR_CLAVE` | `false` | `true` restablece la clave del admin en cada arranque |
| `FLYWAY_ENABLED` | `true` | Aplica al arrancar las migraciones de `db/migration` (V2: firma de consultas y cirugía↔consulta) |
| `JPA_DDL_AUTO` | `validate` | Validar el esquema, sin modificarlo |
| `APP_TIMEZONE` | `America/Lima` | Zona horaria de Hibernate y las fechas |
| `LOG_LEVEL_*` | `INFO` / `WARN` | Niveles de log por paquete |
| `MULTIPART_MAX_FILE` | `10MB` | Tamaño máximo por archivo |

Perfiles disponibles: `dev` (en `application-dev.yml`) permite que Hibernate
cree tablas faltantes; el perfil por defecto usa `ddl-auto: validate`, que
comprueba el esquema y **no lo modifica**.

> Antes de cualquier despliegue, define `JWT_SECRET` con al menos 256 bits y
> cambia las contraseñas de todas las cuentas. Si la variable falta, el backend
> genera una clave aleatoria por ejecución y los tokens se invalidan al
> reiniciar.

### Docker

```bash
docker build -t clinica-api .
# DB_URL debe apuntar a un MySQL accesible desde el contenedor:
docker run --rm -p 8080:8080 \
  -e DB_URL='jdbc:mysql://host.docker.internal:3306/clinica_ojitos?useSSL=false&allowPublicKeyRetrieval=true&serverTimezone=America/Lima' \
  -e DB_USER=root -e DB_PASSWORD=tu_clave \
  -e JWT_SECRET='una-clave-de-al-menos-32-caracteres' \
  clinica-api
```

La imagen es multi-stage: compila con Maven y ejecuta el JAR sobre un JRE
Alpine. Desde la raíz, `docker compose up -d --build` levanta MySQL, API y web
en orden, esperando el healthcheck de cada uno. El tutorial de producción con
Coolify está en [`../docs/DESPLIEGUE.md`](../docs/DESPLIEGUE.md).