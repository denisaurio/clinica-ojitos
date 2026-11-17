# Estructura del proyecto — carpeta por carpeta

Guía de referencia de **cada carpeta** del repositorio: qué contiene, cómo
funciona y cómo se relaciona con las demás.

Lee primero el `README.md` (contrato funcional) y el `AGENTS.md` (reglas del
proyecto). Este documento es la referencia de navegación interna.

---

## Mapa general

```
clinica-ojitos/
│
├── sql/             La base de datos: el modelo completo, en 6 scripts
├── backend/         La API REST en Spring Boot (con Dockerfile)
├── frontend/        La interfaz en Angular (con Dockerfile + nginx)
├── testing/         Pruebas por módulo y de relaciones (Node, sin dependencias)
├── docs/            Navegación interna y tutorial de despliegue
│
├── docker-compose.yml  Los 3 servicios para probar en local
├── .env.example        Plantilla completa de configuración
├── README.md           Qué hace el sistema y cómo se levanta
├── AGENTS.md           Qué puede y qué no puede hacer un agente aquí
└── .gitignore          Lo que no se versiona
```

Las tres carpetas de código son **independientes entre sí**. No se importan
tipos ni clases de una a otra: se comunican por HTTP.

```
frontend  ──HTTP/JSON + JWT──►  backend  ──JDBC──►  MySQL
(Angular)                        (Spring)            (sql/)
    ▲                              ▲
    └──────── testing/ ────────────┘   (verifica contrato y cada módulo)
```

**Por qué los datos viven en `sql/` y no en el backend.** El esquema se crea
con scripts y no con `ddl-auto`. Así la base de datos es un artefacto
versionado y revisable, y cualquier persona puede reconstruirla ejecutando dos
comandos. El backend solo *valida* que el esquema coincida
(`ddl-auto: validate`), nunca lo modifica en producción.

---

# 1. `sql/` — La base de datos

Seis scripts. Los de instalación se ejecutan **en orden** y son idempotentes:
se pueden volver a ejecutar sin romper nada.

| Script | Qué hace | Cuándo se ejecuta |
|---|---|---|
| `01_esquema.sql` | Crea la base, las 24 tablas, los índices y las 3 vistas | Siempre, primero |
| `02_datos_prueba.sql` | Carga los datos de demostración del prototipo | Después del esquema |
| `03_consultas.sql` | Consultas de evidencia para la sustentación | Para documentar |
| `04_cuentas_iniciales.sql` | Crea la cuenta `admin` / `admin123` y las de recepción y paciente | Después de los datos |
| `05_sedes.sql` | Catálogo de 37 sedes: universidades y centros del Perú | Con los anteriores |
| `06_cambiar_rol.sql` | Reasigna el rol de una cuenta concreta | Solo cuando se necesita |

```bash
# En bash o Git Bash:
mysql -u root -p < sql/01_esquema.sql
mysql -u root -p < sql/02_datos_prueba.sql
mysql -u root -p < sql/04_cuentas_iniciales.sql
mysql -u root -p < sql/05_sedes.sql

# En PowerShell (el de VS Code e IntelliJ) la redirección `<` NO existe.
# Usa el comando source:
mysql -u root -p -e "source sql/01_esquema.sql"
mysql -u root -p -e "source sql/02_datos_prueba.sql"
mysql -u root -p -e "source sql/04_cuentas_iniciales.sql"
mysql -u root -p -e "source sql/05_sedes.sql"
```

Desde MySQL Workbench también funciona: **File → Open SQL Script** y el botón ⚡.

### Cómo se organizan las tablas

Están separadas en tres grupos que se corresponden con las secciones del
script:

**Catálogos** (`rol`, `sede`, `subespecialidad`, `tipo_seguro`, `estado_cita`,
`tipo_consulta`, `ojo`, `tipo_tratamiento`, `estado_tratamiento`,
`tipo_examen`, `dia_semana`, `tipo_bloque_horario`). Son tablas de referencia
con `id` y `codigo`/`nombre`. Son tablas y no `ENUM` de MySQL para poder
ampliarlas sin migración de esquema — es el requisito de **RNF-05**.

**Núcleo del negocio** (`usuario`, `paciente`, `oftalmologo`,
`horario_laboral`, `cita`, `consulta`, `examen`, `cirugia`, `tratamiento`,
`control_tratamiento`, `auditoria`). Estas sí llevan las reglas de negocio
escritas como restricciones.

**Vistas** (`v_agenda_diaria`, `v_historial_clinico`,
`v_evolucion_presion_intraocular`). Son consultas de lectura con los `JOIN` ya
resueltos, usadas para reportes y para la evidencia de la fase 5.

### Las dos reglas de negocio que viven en la base

No están solo en Java. La base es la última barrera:

- **RF1.2** — `UNIQUE KEY uq_paciente_documento (documento)`.
- **RF5.2** — `UNIQUE KEY uq_oftalmo_colegiatura (numero_colegiatura)`.
- **RF3.2** — el cruce de citas se resuelve con una columna generada:

```sql
slot_ocupado VARCHAR(20) GENERATED ALWAYS AS
  (IF(bloqueo = 1, CONCAT(fecha,' ',hora_inicio), NULL)) STORED,
UNIQUE KEY uq_cita_agenda (oftalmologo_id, slot_ocupado)
```

Una cita activa ocupa su turno; una cancelada pone `bloqueo = 0`, el valor
generado pasa a `NULL` y MySQL **deja reutilizar el horario** (porque ignora
los `NULL` en un índice único). Así una sola regla cubre los dos casos.

### Cómo se relaciona con el backend

Cada tabla tiene una entidad JPA con el mismo nombre en
`backend/.../domain/entity/`. El campo `sede_id`, por ejemplo, aparece como
`Sede sede` en la entidad y como `Integer` en los DTO, porque `sede` es un
catálogo.

---

# 2. `backend/` — La API REST

99 clases Java. Sigue el modelo **Controller → Service → Repository** con
inyección de dependencias por constructor.

```
backend/
├── Dockerfile                    Imagen multi-stage (Maven → JRE Alpine)
├── pom.xml
├── mvnw / mvnw.cmd / .mvn/       Maven Wrapper (no requiere Maven instalado)
└── src/
    ├── main/
    │   ├── java/com/clinicaojitos/
    │   │   ├── ClinicaOftalmologicaApplication.java
    │   │   ├── config/            Configuración transversal
    │   │   ├── security/          Autenticación y autorización
    │   │   ├── domain/
    │   │   │   ├── entity/        25 entidades JPA
    │   │   │   ├── repository/    24 repositorios
    │   │   │   ├── service/       9 servicios
    │   │   │   └── dto/           9 archivos de records
    │   │   ├── controller/        10 controladores REST
    │   │   ├── exception/         Excepciones y manejador global
    │   │   └── audit/             Bitácora de auditoría
    │   └── resources/
    │       ├── application.yml       Base, todo por variables de entorno
    │       └── application-dev.yml   Perfil de desarrollo local
    └── (las pruebas JUnit viven en ../testing/backend/java)
```

El `pom.xml` apunta `testSourceDirectory` a `../testing/backend/java`: las
pruebas están fuera de `backend/` para que todo lo que se ejecuta viva en
`testing/`. Son **53**: 25 unitarias con Mockito y 28 de integración con
Spring + H2 (sin MySQL).

Todas las claves de `application.yml` (`DB_URL`, `JWT_SECRET`, niveles de log,
tamaños de multipart, etc.) tienen su valor por defecto **o** su variable de
entorno equivalente. La lista completa está en
[`../.env.example`](../.env.example). Ningún secreto se versiona.

## `domain/entity/` — El modelo

Una clase por tabla. Todas usan Lombok (`@Getter`, `@Setter`, `@Builder`), y
cada una documenta en su javadoc a qué requisito funcional pertenece.

```
Paciente.java          RF-01  datos personales y antecedentes
Cita.java              RF-03  incluye el control de cruce de horario
Consulta.java          RF-02  signos vitales oculares y notas SOAP
Tratamiento.java       RF-04  medicación, lentes, terapia o cirugía
Oftalmologo.java       RF-05  colegiatura y subespecialidad
Usuario.java           RF-06  credenciales y rol
```

Los catálogos (`Rol`, `Ojo`, `EstadoCita`…) son entidades simples de solo `id`
y `nombre`. Las entidades de negocio usan `@ManyToOne` para apuntar a ellos.

Un detalle importante: `pioOd` y `pioOi` son `BigDecimal`, no `double`. En la
base la presión intraocular es `DECIMAL(5,2)` — un decimal exacto en mmHg — y
Hibernate rechaza el arranque si el tipo no coincide. El `Mapeador` lo
convierte a `Double` solo al salir hacia la API.

`UsuarioOftalmologo` es la única excepción al patrón: no tiene un `id` propio
sino una clave compuesta de dos columnas. Por eso va acompañada de
`UsuarioOftalmologoId`, la clase `@IdClass` que JPA necesita para reconstruir
esa identidad.

## `domain/repository/` — El acceso a datos

24 interfaces que extienden `JpaRepository`. Los repositorios de catálogo son
casi vacíos; los de negocio llevan las consultas **JPQL** (consultas sobre las
entidades, no sobre los nombres físicos de las tablas):

```java
@Query("""
        SELECT c FROM Consulta c
        WHERE c.paciente.id = :pacienteId
          AND (c.pioOd IS NOT NULL OR c.pioOi IS NOT NULL)
        ORDER BY c.fecha ASC
        """)
List<Consulta> evolucionPio(@Param("pacienteId") Long pacienteId);
```

`CitaRepository.contarSolapes()` es la que sostiene la regla RF3.2 en la capa
de aplicación.

## `domain/service/` — Las reglas de negocio

9 servicios. Aquí vive **toda** la lógica: los controladores no deciden nada.

| Servicio | Responsabilidad |
|---|---|
| `AuthService` | Login, token, límite de 3 intentos |
| `PacienteService` | RF-01, unicidad de documento |
| `ConsultaService` | RF-02, historial y evolución |
| `CitaService` | RF-03, agenda, disponibilidad, reprogramación |
| `TratamientoService` | RF-04, indicaciones y controles |
| `OftalmologoService` | RF-05, directorio y horarios |
| `CatalogoService` | Listas de referencia |
| `DashboardService` | Paneles por rol |
| `Mapeador` | Convierte entidades en DTO |

Un detalle que conviene conocer: `Mapeador` existe para que **ninguna entidad
JPA escape a la capa HTTP**. Cada método `aEntidad()` construye un `record`
con los campos que la API puede mostrar. `passwordHash` simplemente nunca se
copia.

`AuthService` delega el contador de intentos a `RegistroAccesoService` porque,
al lanzar la excepción de error, la transacción de la petición se revertiría
y el contador volvería a cero. Ese servicio usa `REQUIRES_NEW` para confirmar
el incremento aparte — sin eso, la cuenta nunca se bloquearía.

## `domain/dto/` — Los contratos

9 archivos, cada uno con varios `record` anidados: `PacienteDto` contiene
`PacienteDto.Request`, `PacienteDto.Response`, etc.

Son **inmutables** y llevan las validaciones de Bean Validation, de modo que
un dato inválido nunca llega al servicio:

```java
@NotBlank(message = "El documento de identidad es obligatorio")
@Size(max = 20)
String documento,

@DecimalMin("0") @DecimalMax("80")
Double pioOd,
```

Los `record` no tienen setters, así que un DTO nunca se modifica por error
después de crearse.

## `controller/` — Los endpoints

10 controladores, uno por módulo. Son delgados: validan, delegan y devuelven.

```java
@PostMapping
@PreAuthorize("hasAnyRole('ADMINISTRADOR','RECEPCIONISTA')")
public PacienteDto.Response registrar(@Valid @RequestBody PacienteDto.Request request) {
    return pacienteService.registrar(request);
}
```

`@PreAuthorize` es la **autorización real**. Ocultar un botón en Angular es
cortesía visual; esto es seguridad.

Todas las rutas cuelgan de `/api/v1`. La documentación interactiva está en
`http://localhost:8080/swagger-ui.html`.

## `exception/` — Los errores

Cada regla de negocio tiene su propia excepción: `DocumentoDuplicadoException`,
`CruceDeHorarioException`, `ColegiaturaDuplicadaException`,
`CredencialesInvalidasException`…

`GlobalExceptionHandler` las traduce a códigos HTTP. Es el **único** lugar que
construye respuestas de error, y todas tienen la misma forma:

```json
{ "timestamp": "...", "status": 409, "error": "Conflict",
  "message": "Este documento de identidad ya está registrado.", "path": "/api/v1/pacientes" }
```

Ese `message` es el texto que el frontend muestra junto al campo del
formulario, así que cada excepción escribe un mensaje pensado para un humano.

## `security/` — El acceso

| Clase | Función |
|---|---|
| `JwtService` | Emite y valida tokens |
| `JwtAuthenticationFilter` | Lee el token y establece la identidad |
| `CustomUserDetailsService` | Carga el usuario para el login |
| `SecurityUtils` | ¿Quién es el usuario actual y qué rol tiene? |
| `RegistroAccesoService` | Contador de intentos fallidos, en transacción aparte |

**El JWT nunca lleva datos clínicos.** Solo `sub` (usuario), `uid`, `rol` y
caducidad. El token viaja en el navegador; si contuviera información del
paciente, una fuga expondría datos sanitarios.

`RegistroAccesoService` merece una explicación, porque parece un detalle y no
lo es. El requisito RF6.2 dice que tres intentos fallidos bloquean la cuenta.
El flujo natural sería: incrementar el contador, guardar y lanzar el error. Pero
`login()` es `@Transactional` y la excepción que lanza es un
`RuntimeException`, así que **la transacción se revierte y el contador vuelve a
cero**: la cuenta nunca se bloquearía. Por eso el incremento se delega a un
servicio aparte anotado con `@Transactional(propagation = REQUIRES_NEW)`, que
confirma su escritura aunque la petición termine con error.

## `config/` — El arranque

`SecurityConfig` (filtros, CORS, BCrypt), `OpenApiConfig` (Swagger) y
`DatosIniciales` (verifica que los catálogos estén cargados y avisa por consola
si falta alguno — es la pista principal cuando el arranque falla).

La zona horaria no está escrita en el código: la propiedad de Hibernate
`jdbc.time_zone` se llena con `APP_TIMEZONE`. Si `TZ`, `APP_TIMEZONE` y el
`serverTimezone` del `DB_URL` no coinciden, las citas salen corridas.

## `audit/` — La bitácora (RNF-01)

`@Auditado` marca un método; `AuditoriaAspecto` intercepta y escribe en la tabla
`auditoria`. Así toda lectura del historial clínico queda registrada sin
ensuciar el servicio.

---

# 3. `frontend/` — La interfaz

Angular 20 con componentes **standalone** y **Signals**. Sin Angular Material:
los componentes son propios para que coincidan con el prototipo.

```
frontend/
├── package.json / angular.json / proxy.conf.json
├── Dockerfile / nginx.conf.template / docker-entrypoint.sh
├── public/
│   └── env.js           Configuración de ejecución (la sobrescribe el contenedor)
└── src/
    ├── main.ts / index.html / styles.scss
    ├── styles/          Variables SCSS del design system
    ├── environments/    Valores por defecto (dev, prod) y runtime-env.ts
    └── app/
        ├── app.config.ts / app.routes.ts / app.ts
        ├── core/        Lo que toca a la API
        ├── shared/      Lo reutilizable entre pantallas
        ├── layout/      El armazón (sidebar + topbar)
        └── features/    Una carpeta por requisito funcional
```

## `styles/` — El design system

Un solo archivo de variables SCSS. **Ningún componente define un color
suelto**: todos usan las variables de aquí.

```scss
$primary:       #1B3A5F;   // botones, sidebar activo
$sidebar-bg:    #F1F5F9;
$page-bg:       #F8FAFC;
$border:        #E2E8F0;
$danger:        #DC2626;
$radius:        10px;
```

## `core/` — La conexión con la API

| Carpeta | Contenido |
|---|---|
| `core/models/` | 10 archivos de interfaces TypeScript que reflejan los DTOs del backend |
| `core/services/` | 10 servicios, uno por módulo, más los datos de demostración |
| `core/guards/` | `authGuard` (¿hay sesión?) y `roleGuard` (¿el rol sirve?) |
| `core/interceptors/` | Adjunta el token y trata los errores |

**Regla de oro:** los componentes nunca injectan `HttpClient`. Hablan con los
servicios de aquí, y solo los servicios conocen la API. Por eso cambiar de
backend o de URL es tocar un solo archivo.

La configuración tiene dos capas:

| Archivo | Papel |
|---|---|
| `src/environments/environment.ts` | Valores **por defecto** al compilar (`apiUrl: '/api/v1'`, `useMockApi: false`) |
| `src/environments/runtime-env.ts` | Fusiona los valores por defecto con `window.__env` si existe |
| `public/env.js` | Configuración de **ejecución**; en Docker la regenera el entrypoint desde las variables de entorno |

Así, cambiar `API_URL`, `APP_NAME` o `USE_MOCK_API` en el contenedor **no exige
recompilar Angular**: se reinicia el servicio y `env.js` se reescribe. El
`proxy.conf.json` solo aplica a `npm start` y desvía `/api` a
`localhost:8080`; en producción lo hace nginx con `API_PROXY_TARGET`.

## `shared/` — Lo reutilizable

| Carpeta | Contenido |
|---|---|
| `shared/components/` | 14 componentes: botones, tarjetas, badges, tablas, modales, formularios, alertas, wizard, avatar, paginación, skeletons |
| `shared/layout/` | `sidebar` y `topbar`: el armazón de la aplicación |
| `shared/charts/` | Las gráficas en SVG puro, sin librerías |
| `shared/icons/` | El registro de iconos SVG |

Las gráficas están hechas con `<svg>` a mano en lugar de una librería como
Chart.js: el prototipo las muestra en un tamaño concreto, una dependencia
extra sería más peso que código, y así el estilo hereda los mismos tokens.

### Una trampa de `ui-button`

El componente declara su tipo así:

```ts
readonly tipo = input<'button' | 'submit' | 'reset'>('button');
```

El atributo se llama **`tipo`**, no `type`. Si en una plantilla escribes
`<ui-button type="submit">`, Angular lo ignora por completo —`type` no es
ningún input del componente— y el `<button>` interno queda en
`type="button"`, que **no envía el formulario**. El clic no dispara nada, sin
error ni aviso: el formulario simplemente no se envía.

Cuando el botón vive dentro de un `<form>`, la forma correcta es:

```html
<form (ngSubmit)="entrar()">
  <ui-button tipo="submit">Iniciar Sesión</ui-button>
</form>
```

Los `<button>` nativos del proyecto usan `type="button"` con normalidad; la
confusión solo aparece en `ui-button`.

## `features/` — Las pantallas

Cada carpeta es un requisito funcional, con carga diferida (*lazy loading*)
y sus propias rutas.

| Carpeta | RF | Pantallas |
|---|---|---|
| `features/auth/` | RF-06 | Inicio de sesión, recuperación de clave |
| `features/dashboard/` | — | Paneles de admin, especialista, recepción y paciente |
| `features/pacientes/` | RF-01 | Listado, alta en 3 pasos, ficha del paciente |
| `features/historial/` | RF-02 | Línea de tiempo, evolución de PIO, nueva consulta |
| `features/citas/` | RF-03 | Agenda semanal, reserva, confirmación, reprogramación |
| `features/tratamientos/` | RF-04 | Prescripción y seguimiento |
| `features/cirugias/` | RF-04 | Registro de procedimiento quirúrgico |
| `features/oftalmologos/` | RF-05 | Directorio, alta, horarios, perfil |
| `features/configuracion/` | — | Ajustes de la cuenta |

Cada carpeta tiene sus propios `*.routes.ts`, lo que divide el código en
paquetes que Angular carga solo cuando se necesitan.

---

# 4. `testing/` — Pruebas por módulo y relaciones

Verifica el sistema **módulo por módulo**, sin framework y **sin dependencias
de npm**: solo Node 18 o superior. Es la herramienta para responder «si la web
falla, ¿dónde falla?».

```
testing/
├── run.mjs                    Runner HTTP: orden, contexto, limpieza e informe
├── run-tests.mjs              Runner Maven: JUnit + build + reporte HTML
├── modulos.json               Módulos y relaciones que usa run-tests.mjs
├── README.md                  Guía de uso, variables y lectura del informe
├── contract/
│   └── contrato-api.test.mjs  13 comprobaciones estáticas (sin red)
├── lib/
│   ├── config.mjs             Lee .env y variables TEST_*
│   ├── http.mjs               Cliente fetch con JWT y errores tipados
│   ├── assert.mjs             asegurar, igual, incluye, omitir…
│   ├── util.mjs               Fechas, documentos TEST y milisegundos
│   ├── module-map.mjs         Módulos funcionales y sus relaciones
│   └── report.mjs             Tabla, fallos en rojo y resumen
├── modules/                   Una prueba HTTP por módulo funcional
│   ├── estado / auth / catalogo
│   ├── pacientes / oftalmologos / historial
│   ├── citas / tratamientos / dashboards
│   └── admin / seguridad
├── relations/
│   └── flujo-completo.test.mjs  Paciente → cita → consulta → tratamiento → cirugía
└── backend/java/              Pruebas JUnit que ejecuta Maven (53)
    └── com/clinicaojitos/
        ├── domain/service/    Unitarias con Mockito
        ├── integracion/       API completa con Spring + H2
        ├── relaciones/        Dependencias entre servicios
        └── security/          Firma y expiración del JWT
```

Cómo se ejecuta:

```bash
# Solo contrato: no necesita MySQL ni backend
TEST_MODE=contract node testing/run.mjs

# Contrato + integración HTTP: requiere la API ACTIVA
node testing/run.mjs

# Pruebas JUnit (desde la JVM) + build + reporte HTML
node testing/run-tests.mjs
```

Los dos runners son complementarios: `run-tests.mjs` ejecuta las 53 pruebas
JUnit de `testing/backend/java` con Maven y agrupa el resultado por módulo;
`run.mjs` prueba el sistema desde fuera, como lo haría el navegador.

Qué imprime:

| Columna | Significado |
|---|---|
| `MÓDULO` | Nombre del módulo funcional |
| `TIEMPO` | Milisegundos que tardó el módulo completo |
| `PRUEBAS` | Aprobadas / total (las omitidas cuentan) |
| `ESTADO` | `OK` verde, `PARCIAL` amarillo, **`FALLOS` rojo** |

Al final muestra el **mapa de relaciones** (`citas → pacientes, oftalmologos,
catalogo, dashboards`) y el detalle de cada fallo. Código de salida `1` si algo
falla.

Los datos de prueba llevan el prefijo `TEST`; las citas se cancelan y los
pacientes se dan de baja lógica al terminar. Con `TEST_WRITES=false` la suite
solo lee y omite las escrituras. Detalle completo en
[`../testing/README.md`](../testing/README.md).

---

# 5. Cómo se encadenan las tres carpetas

Un ejemplo completo: **el oftalmólogo registra una consulta**.

```
1. PACIENTE  →  "Nueva consulta" en /historial/nueva-consulta
2. FRONTEND  →  HistorialService.registrar()  ──POST /api/v1/historiales──►
3. BACKEND   →  ConsultaController           valida el DTO con @Valid
4.           →  ConsultaService              guarda la consulta, atribuyéndola
                                              al oftalmólogo de la sesión
5.           →  ConsultaRepository           INSERT en `consulta`
6. MYSQL     →  fila creada
7. FRONTEND  ← 201 Created, la pantalla muestra la consulta en la línea de tiempo
```

Otro: **el sistema rechaza un DNI repetido**.

```
1. FRONTEND  →  el usuario escribe 45678912C
2.           →  GET /pacientes/existe-documento?documento=...  →  {existe:true}
3. FRONTEND  →  el campo se pinta de rojo y muestra
                "Este DNI ya está registrado" (sin llegar a enviar)
4.           →  si de todos modos se envía, POST /pacientes
5. BACKEND   →  PacienteService detecta el duplicado
6.           →  lanza DocumentoDuplicadoException
7.           →  GlobalExceptionHandler la traduce a 409
8. FRONTEND  ← 409, muestra el mensaje junto al campo
9. MYSQL     →  el índice único habría rechazado el INSERT igual
```

Esa doble barrera —la validación en el servicio y el índice en la base— es
lo que permite que dos peticiones simultáneas dupliquen un paciente.

---

# 6. Dónde tocar según la tarea

| Quiero cambiar… | Voy a… |
|---|---|
| El aspecto de un botón o una tarjeta | `frontend/src/styles/` y `shared/components/` |
| La forma de una pantalla | `frontend/src/app/features/<módulo>/` |
| Un endpoint nuevo | `backend/.../controller/` + `service/` + `repository/` |
| Una regla de negocio | `backend/.../domain/service/` (y su excepción) |
| El formato de una respuesta JSON | `backend/.../domain/dto/` |
| Una tabla o una columna | `sql/07_<nombre>.sql` (nunca editar un script ya ejecutado) |
| Un dato de demostración | `sql/02_datos_prueba.sql` |
| El texto de un error | El mensaje dentro de la excepción en `exception/` |
| La navegación lateral | `frontend/src/app/shared/layout/sidebar.ts` |
| Una variable de configuración | `.env.example` + `application.yml` + `runtime-env.ts` |
| Una prueba HTTP de módulo | `testing/modules/<módulo>.test.mjs` |
| Una prueba JUnit de la API | `testing/backend/java/.../integracion/` |
| El informe de pruebas | `testing/lib/report.mjs`, `module-map.mjs` y `modulos.json` |
| El despliegue | `Dockerfile` del servicio, `docker-compose.yml`, `docs/DESPLIEGUE.md` |

Si cambias algo público —un endpoint, una ruta, un token— actualiza el
`README.md`. Es lo que pide el paso 6 del flujo de trabajo de `AGENTS.md`.