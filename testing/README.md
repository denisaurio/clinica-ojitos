# Suite de pruebas por módulo

Verifica cada módulo funcional del sistema **de forma independiente** y las
**relaciones** entre ellos, sin framework de pruebas y sin dependencias de npm.
Es el material de la fase 11 del proyecto y también la comprobación previa a un
despliegue en Coolify.

```
node testing/run.mjs
```

Requiere **Node 18 o superior** (usa `fetch`, `AbortController` y `node:test`
implícito en los módulos ESM). No hay que ejecutar `npm install`.

---

## 1. Qué necesitas para cada modo

| Modo | Necesita | Qué ejecuta |
|---|---|---|
| `contract` | Solo el repositorio | 13 comprobaciones estáticas de contrato |
| `auto` | Repositorio + backend ACTIVO + MySQL cargado | Contrato y todos los módulos |
| `auto` sin backend | Solo el repositorio | Contrato; el resto queda **omitido** con el motivo |

El runner lee el `.env` de la raíz del repositorio. Las variables del proceso
tienen prioridad, así que puedes sobrescribirlas desde la terminal o desde un
job de CI.

### Comprobación rápida sin base de datos

PowerShell:

```powershell
$env:TEST_MODE = 'contract'
node testing/run.mjs
```

Bash / Linux / macOS:

```bash
TEST_MODE=contract node testing/run.mjs
```

### Comprobación completa con el backend levantado

```bash
# Terminal 1: MySQL con sql/01_esquema.sql y sql/02_datos_prueba.sql
# Terminal 2:
cd backend
./mvnw spring-boot:run

# Terminal 3: desde la raíz del repositorio
node testing/run.mjs
```

La suite detecta `GET /api/v1/estado` con `estado: "ACTIVA"`. Si no responde,
no falla: omite los módulos de integración y lo explica en la tabla.

---

## 2. Variables de entorno

Todas son opcionales; los valores por defecto apuntan al entorno local.

| Variable | Por defecto | Uso |
|---|---|---|
| `TEST_BASE_URL` | `http://localhost:8080/api/v1` | URL base de la API |
| `TEST_MODE` | `auto` | `auto` (contrato + integración) o `contract` |
| `TEST_WRITES` | `true` | `false` omite altas, consultas, citas y prescripciones |
| `TEST_TIMEOUT_MS` | `15000` | Tiempo máximo por petición HTTP |
| `TEST_ADMIN_USER` | `admin` | Administrador para las pruebas |
| `TEST_ADMIN_PASSWORD` | `admin123` | Clave del administrador |
| `TEST_DOCTOR_USER` | `dra.rostova` | Oftalmóloga demo |
| `TEST_DOCTOR_PASSWORD` | `Ojitos2026*` | Clave de la oftalmóloga |
| `TEST_PATIENT_USER` | vacío | Paciente existente (opcional) |
| `TEST_PATIENT_PASSWORD` | vacío | Clave de ese paciente (opcional) |

`TEST_PATIENT_*` solo hace falta si quieres reutilizar una cuenta de paciente
ya existente. Si se dejan vacías, el módulo de pacientes crea una ficha TEST y
usa las credenciales que devuelve el alta.

Ejemplo contra el despliegue de Coolify:

```powershell
$env:TEST_BASE_URL = 'https://app.midominio.com/api/v1'
$env:TEST_ADMIN_PASSWORD = 'la-clave-real'
node testing/run.mjs
```

> No versiones nunca un `.env` con claves reales. `.gitignore` ya ignora
> `.env` y deja versionado únicamente `.env.example`.

---

## 3. Qué prueba cada módulo

| Módulo | Pruebas | Qué verifica |
|---|---:|---|
| `contrato` | 13 | `.env.example` completo, `.gitignore`, configuración Spring, runtime de Angular, DTOs y servicios del frontend |
| `estado` | 2 | Health check público y módulos RF declarados |
| `auth` | 6 | Login, JWT, perfil, intentos, oftalmólogo demo y cierre de sesión |
| `catalogo` | 8 | Once catálogos, códigos `LUN..DOM`, `CONSULTA/CIRUGIA/DESCANSO`, `OD/OI/AO` y estados |
| `pacientes` | 10 | Listado, documento libre/duplicado, alta con credenciales, ficha, búsqueda, edición, portal y baja lógica |
| `oftalmologos` | 7 | Directorio, activos, ficha, matriz de horarios, métricas y colegiatura |
| `historial` | 7 | Consulta oftalmológica, cronología, evolución de PIO, diagnósticos y detalle |
| `citas` | 12 | Agenda, disponibilidad, alta, solapes, estados, reprogramación y cancelación |
| `tratamientos` | 9 | Prescripción, vigentes, seguimiento, controles, cirugías y validaciones |
| `dashboards` | 4 | Paneles de administrador, médico, recepción y portal del paciente |
| `admin` | 6 | Auditoría, filtros, trazabilidad, RBAC, 401 y 404 |
| `seguridad` | 9 | RBAC por rol, aislamiento del paciente y cierre de la fuga de agenda |
| `flujo-completo` | 8 | Paciente → cita → consulta → tratamiento → cirugía → historial → panel |
| **Total** | **101** | |

Las cantidades son las que imprime el informe; una prueba omitida no cuenta
como aprobada.

### Relaciones que se comprueban

```
auth          → pacientes, citas, tratamientos, historial, dashboards, admin
catalogo      → citas, tratamientos, oftalmologos
pacientes     → historial, citas, tratamientos, dashboards
oftalmologos  → citas, tratamientos, catalogo
historial     → pacientes, citas, tratamientos
citas         → pacientes, oftalmologos, catalogo, dashboards
tratamientos  → pacientes, oftalmologos, catalogo, historial
dashboards    → pacientes, citas, tratamientos, oftalmologos
admin         → auth, pacientes, historial
seguridad     → auth, pacientes, historial, citas, tratamientos, admin
flujo-completo→ catalogo, pacientes, oftalmologos, citas, tratamientos, historial, dashboards, seguridad
```

El informe final imprime este mismo mapa para responder «qué módulo se
relaciona con qué».

---

## 4. Cómo se lee el informe

```
  Resultados por módulo
  ──────────────────────────────────────────────────────────────────────────────
  MÓDULO              TIEMPO      PRUEBAS     ESTADO
  contrato            118 ms      13/13       OK
  citas               842 ms      12/12       OK
  seguridad           310 ms      8/9         FALLOS (1)
  ──────────────────────────────────────────────────────────────────────────────

  Fallos detectados
  ──────────────────────────────────────────────────────────────────────────────
  seguridad
    ✗ El paciente no puede leer el historial de otra ficha (22 ms)
      GET /historiales?pacienteId=... respondió 200 y debería responder 403
```

- **TIEMPO**: milisegundos que tardó el módulo completo.
- **PRUEBAS**: aprobadas / total (las omitidas cuentan en el total).
- **Estado**: `OK` verde, `PARCIAL` amarillo si hubo omisiones y
  **`FALLOS` en rojo** si alguna prueba falló.
- Los fallos se listan con su mensaje y el código de salida es `1`, de modo que
  un job de CI o un script de despliegue puede detenerse.
- Los módulos omitidos muestran el motivo (`TEST_MODE=contract`, API caída,
  falta de sesión, etc.). Omitir no es aprobar.

---

## 5. Datos de prueba y limpieza

- Todo dato creado lleva el prefijo **`TEST`** en documento, nombre o
  descripción.
- Los documentos usan la marca de tiempo para no chocar entre ejecuciones.
- Las citas de prueba se cancelan al terminar.
- Los pacientes de prueba se dan de baja con `DELETE /pacientes/{id}` (baja
  lógica: la ficha y su historia clínica se conservan).
- El runner ejecuta la limpieza **en orden inverso** (LIFO) aunque algún
  módulo haya fallado.
- Tratamientos y cirugías **no tienen endpoint de borrado**: quedan
  registrados con la marca `TEST`. Es intencional, porque son historia
  clínica y el sistema no debe borrarla.

Con `TEST_WRITES=false` no se crea nada: la suite solo lee y omite las pruebas
de escritura. Es el modo recomendado para ejecutar contra una base con datos
reales.

---

## 6. Qué comprueba el modo contrato (sin red)

| # | Comprobación |
|---|---|
| 1 | `.env.example` declara todas las variables de despliegue |
| 2 | `.env` está ignorado y `.env.example` sí se versiona |
| 3 | Spring Boot lee base de datos, JWT y CORS desde el entorno |
| 4 | El perfil de desarrollo también es configurable |
| 5 | Angular usa configuración de ejecución (`env.js`), no URLs compiladas |
| 6 | `GET /citas` ya no expone la agenda al rol `PACIENTE` |
| 7 | La agenda acepta el rango `desde` / `hasta` |
| 8 | Los catálogos de horarios y estados están publicados |
| 9 | La matriz de horarios devuelve códigos estables |
| 10 | La cita devuelve los campos que pinta la agenda |
| 11 | El servicio de citas habla el contrato real |
| 12 | El servicio de tratamientos usa `tipoId`/`estadoId` y cirugías |
| 13 | El servicio de oftalmólogos traduce métricas y horarios |

Este modo es el que se puede ejecutar en cualquier máquina, incluso sin MySQL ni
Docker, y el que debe pasar siempre antes de un commit.

---

## 7. Estructura

```
testing/
├── run.mjs                         # runner HTTP: orden, contexto, limpieza, informe
├── run-tests.mjs                   # runner Maven: tests Java + build + reporte HTML
├── modulos.json                    # módulos para run-tests.mjs y sus relaciones
├── README.md
├── contract/
│   └── contrato-api.test.mjs       # comprobaciones estáticas offline
├── lib/
│   ├── config.mjs                  # lectura de .env y variables TEST_*
│   ├── http.mjs                    # cliente fetch con JWT y errores tipados
│   ├── assert.mjs                  # asegurar, igual, incluye, omitir…
│   ├── util.mjs                    # fechas, documentos y milisegundos
│   ├── module-map.mjs              # módulos funcionales y sus relaciones
│   └── report.mjs                  # tabla, fallos en rojo y resumen
├── modules/
│   └── *.test.mjs                  # una prueba por módulo funcional
├── relations/
│   └── flujo-completo.test.mjs     # relación punta a punta entre módulos
└── backend/java/                   # pruebas JUnit de Spring (las ejecuta Maven)
    └── com/clinicaojitos/
        ├── domain/service/         # unitarias de la capa de servicio
        ├── integracion/            # API con Spring + H2, sin MySQL
        ├── relaciones/             # mapa de dependencias entre servicios
        └── security/               # JWT: firma, expiración, manipulación
```

Cada módulo exporta:

```js
export default {
  nombre: 'modulo',
  async ejecutar({ prueba, ctx, cliente, config }) {
    await prueba('Descripción de lo que se verifica', async () => {
      // ...
    });
  },
};
```

`ctx` comparte datos entre módulos (`sesion`, `paciente`, `oftalmologo`,
`cita`, `tratamiento`) y expone `exigirSesion()`, `exigirPaciente()`, etc. Si
un dato no existe porque su módulo falló, la prueba se marca **omitida** con el
motivo, no como aprobada.

---

## 8. Pruebas JUnit dentro de `testing/backend/java`

La suite HTTP de `run.mjs` comprueba el sistema desde fuera. En paralelo hay
**53 pruebas JUnit** que se ejecutan dentro de la JVM, sin MySQL:

```bash
cd backend
./mvnw test          # 25 unitarias + 28 de integración = 53
```

| Grupo | Clases | Qué comprueba |
|---|---|---|
| `domain/service/` | 4 | Reglas de negocio con Mockito: citas, pacientes, oftalmólogos, aislamiento del paciente |
| `integracion/` | 9 | La API completa con `MockMvc` y H2: estado, login, catálogos, citas, historial, tratamientos, paneles |
| `relaciones/` | 1 | Qué servicio depende de qué otro y que no haya ciclos |
| `security/` | 1 | Firma, expiración y manipulación del JWT |

El `pom.xml` apunta `testSourceDirectory` a `../testing/backend/java`, así que
las pruebas viven en esta carpeta pero se lanzan con Maven. H2 solo existe en
el *scope* `test`: la aplicación nunca usa H2 en ejecución.

También hay un segundo runner que ejecuta esos tests por módulo, agrupa los
resultados y genera un reporte HTML:

```bash
node testing/run-tests.mjs                  # tests Java + build del frontend
node testing/run-tests.mjs --modulo citas   # solo un módulo
node testing/run-tests.mjs --solo-reporte   # relee los XML de Surefire
```

Genera `testing/reporte/index.html` y `testing/reporte/resultados.json` con
milisegundos por módulo, estado rojo/verde y posibles causas según
`testing/modulos.json`.

### Qué runner usar

| Necesitas… | Runner |
|---|---|
| Comprobar el contrato sin backend ni MySQL | `node testing/run.mjs` con `TEST_MODE=contract` |
| Probar la API real de punta a punta | `node testing/run.mjs` |
| Ejecutar unitarias + integración Java | `node testing/run-tests.mjs` o `mvnw test` |
| Un reporte HTML por módulo | `node testing/run-tests.mjs` |

Los dos runners son complementarios: `run-tests.mjs` mira dentro de la JVM;
`run.mjs` mira el sistema desplegado, como lo vería el navegador.

---

## 9. Limitaciones conocidas

- La integración **no se puede ejecutar** sin MySQL y el backend levantados; en
  este repositorio eso se verifica en la máquina de desarrollo o en el VPS.
- Las escrituras dejan rastros `TEST` en tratamientos y cirugías porque no
  existe borrado clínico. Es el comportamiento correcto.
- La suite no prueba la interfaz Angular en un navegador: comprueba contratos,
  servicios y API. Para la UI se usa `npm run build` y la revisión manual.
- `GET /pacientes/existe-documento` exige token aunque el controlador lo
  documente como público; las pruebas lo llaman autenticadas.
