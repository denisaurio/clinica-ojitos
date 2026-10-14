# Clínica Oftalmológica Ojitos

Sistema web para la gestión integral de una clínica oftalmológica: pacientes,
historial médico ocular, tratamientos, agenda de citas y personal médico.

**Proyecto académico · Grupo 05**
Orduña Montoya Denis Eduardo · Muñoz De La Cruz Fung Tay Antonyo · Paredes Tacuri Edgard Adriano
Docente: Jose Fernando Matos Vera

## Documentación del proyecto

| Documento | Para qué sirve |
|---|---|
| **[`README.md`](README.md)** (este) | Qué hace el sistema, arquitectura, instalación, ruta de aprendizaje, API y fases |
| **[`docs/ESTRUCTURA.md`](docs/ESTRUCTURA.md)** | Qué contiene **cada carpeta**, cómo funciona y cómo se relaciona con las demás |
| **[`docs/FLUJO.md`](docs/FLUJO.md)** | Cómo se usa el sistema: recorrido por cada pantalla y qué endpoint usa |
| **[`docs/interaccion-modulos.pdf`](docs/interaccion-modulos.pdf)** | Diagrama visual: cómo se relacionan los módulos entre sí y cómo se comunican las carpetas de backend y frontend |
| **[`backend/README.md`](backend/README.md)** | La API: cómo ejecutarla, su arquitectura en capas y dónde mirar primero |
| **[`frontend/README.md`](frontend/README.md)** | La interfaz: cómo ejecutarla, su estructura y las reglas del código |
| **[`AGENTS.md`](AGENTS.md)** | Qué puede y qué no puede hacer un agente de IA en este repositorio |

**¿Por dónde empezar?** Si es tu primera vez, ve directo a la
**[Ruta de aprendizaje](#4b-ruta-de-aprendizaje)**: son seis pasos que te llevan
del problema al código en unas dos horas, sin abrir veinte archivos al azar.

---

## 1. Qué hace el sistema

El sistema centraliza la información clínica de una clínica de oftalmología y
la hace accesible desde una única aplicación web. Cubre cinco módulos
funcionales y cuatro roles de acceso.

### Módulos

| Módulo | Requisito | Qué resuelve |
|---|---|---|
| **Pacientes** | RF-01 | Alta, edición, búsqueda y ficha clínica del paciente. Impide documentos duplicados. |
| **Historial médico** | RF-02 | Registro de consultas con agudeza visual, presión intraocular, diagnóstico y notas SOAP, en orden cronológico. |
| **Citas** | RF-03 | Agenda semanal y diaria, reserva, reprogramación y cancelación. Impide el cruce de horarios del mismo médico. |
| **Tratamientos** | RF-04 | Prescripción de fármacos y lentes, terapias y procedimientos quirúrgicos, con controles de seguimiento. |
| **Oftalmólogos** | RF-05 | Directorio del personal médico, colegiatura, subespecialidad y matriz de horarios. |
| **Seguridad** | RF-06 | Autenticación por usuario y contraseña, con control de acceso según rol y registro de auditoría. |

### Roles

| Rol | Puede hacer |
|---|---|
| `ADMINISTRADOR` | Todo. Gestiona médicos, horarios, sedes y audita los accesos. |
| `OFTALMOLOGO` | Consultas, diagnósticos, tratamientos y cirugías de sus pacientes. |
| `RECEPCIONISTA` | Alta de pacientes, agenda de citas, triaje y check-in. |
| `PACIENTE` | Solo lectura de su propia información y de sus citas. |

### Reglas de negocio que el sistema respeta

1. **RF1.2** — El documento de identidad de un paciente es único.
2. **RF3.2** — Un oftalmólogo no puede tener dos citas en el mismo horario.
3. **RF5.2** — El número de colegiatura de un médico es único.
4. **RF6.2** — Tres intentos fallidos como máximo antes del bloqueo temporal.
5. **RNF-01** — Toda consulta al historial clínico queda registrada en auditoría.

---

## 2. Arquitectura

Monorepo con tres piezas independientes que se comunican por HTTP.

```
┌──────────────────────┐        REST / JSON + JWT        ┌──────────────────────┐
│                      │  ───────────────────────────►   │                      │
│   Angular 20         │                                  │   Spring Boot 3.4    │
│   Frontend           │  ◄───────────────────────────   │   Backend (API REST)│
│   :4200              │                                  │   :8080              │
│                      │                                  │                      │
└──────────────────────┘                                  └──────────┬───────────┘
                                                                        │ JDBC
                                                            ┌───────────▼───────────┐
                                                            │   MySQL 8            │
                                                            │   clinica_ojitos     │
                                                            │   :3306              │
                                                            └───────────────────────┘
```

### Backend — arquitectura en capas

La API sigue el modelo **Controller → Service → Repository**, con inyección de
dependencias por constructor en todas las capas (Fase 3 del sílabo).

```
Petición HTTP
   │
   ├─► Controller      Expone los endpoints REST. Valida la entrada con
   │                   Bean Validation y traduce HTTP a llamadas de servicio.
   │
   ├─► Service         Contiene la lógica de negocio y las validaciones de
   │                   cada requisito funcional. Es la única capa que conoce
   │                   las reglas; no depende de HTTP ni de la persistencia.
   │
   ├─► Repository      Extiende JpaRepository. Aísla el acceso a datos detrás
   │                   de una interfaz. Aquí viven las consultas JPQL.
   │
   └─► Entity          Mapea las clases Java a las tablas mediante JPA/Hibernate.
```

Sobre estas capas operan dos transversalidades:

- **GlobalExceptionHandler** — traduce las excepciones de negocio a respuestas
  HTTP coherentes (404, 409, 400, 401, 403).
- **Auditoría** — un `Aspecto` registra los accesos y las operaciones sensibles
  en la tabla `auditoria` (RNF-01).

### Frontend

Angular con componentes **standalone**, Signals para el estado y SCSS con
variables CSS para el design system. La capa de acceso a datos está aislada en
servicios que consumen la API REST, de modo que las pantallas nunca llaman a
`HttpClient` directamente.

---

## 3. Distribución de carpetas

```
clinica-ojitos/
│
├── README.md                     ← Estás aquí
├── AGENTS.md                     ← Alcance y reglas para agentes de IA
├── .gitignore
│
├── docs/                         ← Documentación de navegación interna
│   ├── ESTRUCTURA.md             Qué contiene cada carpeta y cómo se relaciona
│   └── FLUJO.md                  Recorrido por cada pantalla y endpoint usado
│
├── sql/                          ← Entregable de la Fase 5 (base de datos)
│   ├── 01_esquema.sql            DDL: tablas, FK, índices, vistas y catálogos
│   ├── 02_datos_prueba.sql       Datos de demostración (idempotente)
│   ├── 03_consultas.sql          Consultas de evidencia CRUD y JPQL
│   └── 04_cuentas_iniciales.sql  Cuenta administrador (RF-06)
│
├── backend/                      ← Spring Boot 3.4 + Java 21
│   ├── pom.xml
│   ├── src/main/java/com/clinicaojitos/
│   │   ├── ClinicaOftalmologicaApplication.java
│   │   │
│   │   ├── config/               Configuración (CORS, JWT, OpenAPI, datos semilla)
│   │   ├── security/             Spring Security, filtro JWT, roles
│   │   │
│   │   ├── domain/
│   │   │   ├── entity/           Entidades JPA (una por tabla)
│   │   │   ├── repository/       Interfaces JpaRepository + JPQL
│   │   │   ├── service/          Lógica de negocio
│   │   │   └── dto/              Records de entrada y salida (Request/Response)
│   │   │
│   │   ├── controller/           Endpoints REST por módulo
│   │   ├── exception/            Excepciones de negocio + manejador global
│   │   └── audit/                Aspecto de auditoría
│   │
│   ├── src/main/resources/
│   │   ├── application.yml       Configuración base
│   │   ├── application-dev.yml   Perfil de desarrollo local
│   │   └── db/                   Scripts SQL y datos iniciales
│   │
│   └── src/test/java/            Pruebas unitarias JUnit 5 + Mockito
│
└── frontend/                     ← Angular 20
    ├── package.json
    ├── angular.json
    └── src/app/
        ├── core/                 Servicios, interceptores, guards
        │   ├── models/           Interfaces TypeScript del dominio
        │   ├── services/         Cliente de la API REST por módulo
        │   ├── guards/           Guards de ruta por rol
        │   └── interceptors/     Interceptor de JWT y manejo de errores
        │
        ├── shared/               Componentes reutilizables
        │   ├── components/       Botón, tarjeta, badge, tabla, modal, wizard
        │   └── pipes/            Formateadores de fecha, moneda, iniciales
        │
        ├── layout/                Shell: barra lateral, barra superior
        │
        └── features/             Un módulo por RF
            ├── auth/             RF-06  Login, recuperación
            ├── pacientes/        RF-01  Listado, alta, ficha, wizard
            ├── citas/            RF-03  Agenda semanal, reserva, modales
            ├── historial/        RF-02  Timeline, evolución, nueva consulta
            ├── tratamientos/     RF-04  Prescripción, seguimiento, cirugía
            ├── medicos/          RF-05  Directorio, alta, horarios, perfil
            └── dashboards/       Paneles por rol
```

---

## 4. Instalación y puesta en marcha

### Requisitos

| Herramienta | Versión | Nota |
|---|---|---|
| JDK | 21 o superior | **`JAVA_HOME` debe apuntar a la instalación** (ver aviso abajo) |
| Maven | 3.9+ | También sirve el Maven Wrapper incluido: `mvnw` (Windows: `mvnw.cmd`) |
| Node.js | 20+ (probado en 24) | Requerido por Angular |
| MySQL | 8.0.16+ | Necesario por las restricciones `CHECK` y las columnas generadas |

> **Aviso sobre `JAVA_HOME`.** Maven no arranca si esta variable apunta a una
> carpeta inexistente. Compruébalo antes de nada:
>
> ```powershell
> $env:JAVA_HOME
> java -version
> ```
>
> Si `JAVA_HOME` no coincide con lo que devuelve `java -version`, corrígelo en
> *Variables de entorno del sistema → Variables de usuario → JAVA_HOME* y abre
> una terminal nueva. En una sola terminal basta con:
>
> ```powershell
> $env:JAVA_HOME = 'C:\ruta\a\tu\jdk-21'
> ```

### Paso 1 — Base de datos

Desde **MySQL Workbench** (lo más cómodo: ves cada resultado en tabla):

1. Abre la conexión y ve a **File → Open SQL Script**
2. Carga y ejecuta, **en este orden**, con el botón ⚡:
   `sql/01_esquema.sql` → `sql/02_datos_prueba.sql` → `sql/04_cuentas_iniciales.sql` → `sql/05_sedes.sql`
3. Verifica en una pestaña nueva:
   ```sql
   USE clinica_ojitos;
   SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='clinica_ojitos';
   SELECT username FROM usuario;
   ```

Desde la **terminal** (un comando por archivo):

```bash
mysql -u root -p -e "source sql/01_esquema.sql"
mysql -u root -p -e "source sql/02_datos_prueba.sql"
mysql -u root -p -e "source sql/04_cuentas_iniciales.sql"
mysql -u root -p -e "source sql/05_sedes.sql"
```

> **En PowerShell no uses `mysql -u root -p < archivo.sql`.** El símbolo `<`
> es sintaxis de bash; en PowerShell responde *«El operador '<' está reservado
> para uso futuro»*. La forma correcta es la de arriba con `-e "source ..."`.
> Tampoco sirve `Get-Content archivo | mysql`: PowerShell re-codifica la salida
> y MySQL rechaza el BOM.

Los cuatro scripts son **idempotentes**: ejecutarlos dos veces no rompe nada.
`03_consultas.sql` no se ejecuta al instalar; contiene consultas de evidencia
para la sustentación.

Esto crea la base `clinica_ojitos`: **24 tablas** (12 de negocio y 12
catálogos), 3 vistas y datos de demostración con 10 pacientes, 5 oftalmólogos,
18 citas, 21 consultas, 8 tratamientos, 3 cirugías y 7 registros de auditoría.

### Paso 2 — Backend

```bash
cd backend
export DB_URL=jdbc:mysql://localhost:3306/clinica_ojitos
export DB_USER=root
export DB_PASSWORD=tu_clave
mvnw spring-boot:run
```

> Si no defines `JWT_SECRET`, el backend genera una clave aleatoria para esa
> ejecución y te avisa por consola. Todo funciona, pero los tokens dejan de
> ser válidos al reiniciar. Para una clave estable: `export JWT_SECRET=...`.

En PowerShell:

```powershell
cd backend
$env:DB_USER = 'root'
$env:DB_PASSWORD = 'tu_clave'

.\mvnw.cmd spring-boot:run
```

> **PowerShell no ejecuta comandos de la carpeta actual** salvo que los
> llames con el prefijo `.\`. Por eso es `.\mvnw.cmd` y no `mvnw.cmd`; en bash
> y cmd basta con `mvnw` / `mvnw.cmd`.
>
> Si ya tienes Maven instalado en el sistema, `mvn spring-boot:run` también
> funciona y te ahorra un paso.

Espera a ver `Tomcat started on port 8080` (la primera vez tarda ~15 s).
Comprobación rápida:

```bash
curl http://localhost:8080/api/v1/estado
```

La API queda disponible en `http://localhost:8080` y su documentación
interactiva en `http://localhost:8080/swagger-ui.html`.

### Paso 3 — Frontend

```bash
cd frontend
npm install
npm start
```

La aplicación queda disponible en `http://localhost:4200`.

**El frontend consume la API real.** `proxy.conf.json` desvía las llamadas a
`/api` hacia `http://localhost:8080`, así que el backend debe estar arriba.

Si necesitas trabajar **sin base de datos ni backend** —para explorar la
interfaz o preparar una demo sin levantar MySQL— activa el modo demostración:

```
frontend/src/environments/environment.ts  →  useMockApi: true
```

y reinicia `npm start`. En ese modo los servicios devuelven datos de muestra
desde `core/services/demo-data.service.ts` y el login se resuelve en el
navegador. Vuelve a `false` para trabajar contra la API.

### Cuentas de acceso

**Cuenta administrador**

| Usuario | Contraseña | Rol |
|---|---|---|
| `admin` | `admin123` | Administrador |

Las demás cuentas de demostración usan la clave `Ojitos2026*`:

| Usuario | Rol |
|---|---|
| `dra.rostova` | Oftalmólogo (Glaucoma) |
| `dr.mendoza` | Oftalmólogo (Retina) |
| `dra.torres` | Oftalmólogo (Córnea) |
| `recepcion` | Recepcionista |
| `paciente` | Paciente |

> En modo demostración el frontend acepta exactamente las mismas credenciales,
> para que puedas alternar entre ambos sin surprises.

> **Si solo ejecutaste `01` y `04`**, las cuentas de recepción y paciente se crean
> igualmente: `04_cuentas_iniciales.sql` es autónomo y no necesita los datos de
> demostración. Las de oftalmólogo aparecen cuando existan los profesionales del
> seed.

### Cuentas de los profesionales nuevos

Cuando el administrador registra un oftalmólogo, el sistema **le genera una
contraseña aleatoria de 12 caracteres**. No es una clave compartida: cada
profesional recibe la suya.

```
POST /api/v1/oftalmologos
→ 201 { oftalmologo: {...},
        credenciales: { username, password, textoParaDescargar } }
```

El alta muestra un aviso con la credencial y un botón **Descargar credenciales**
que guarda un `.txt` para entregarlo. **La contraseña se ve una sola vez**: en la
base solo queda su hash BCrypt, así que no es recuperable. Si se pierde,
`POST /api/v1/oftalmologos/{id}/credenciales` emite una nueva.

El profesional la cambia desde **Configuración → Mi cuenta**:

```
PATCH /api/v1/auth/cambiar-clave  { passwordActual, passwordNueva }
```

Exige la contraseña actual para que nadie bloquee la cuenta desde un equipo
dejado con la sesión abierta.

> ### ⚠️ Cuentas de demostración — aviso de seguridad
>
> Estas cuentas y sus contraseñas son **públicamente conocidas**: están escritas
> en este README y sus hashes BCrypt en `sql/02_datos_prueba.sql`. Sirven
> únicamente para desarrollo y demostración en un equipo local.
>
> **No las uses en un entorno desplegado.** Antes de publicar el sistema en
> cualquier servidor hay que crear cuentas nuevas con contraseñas fuertes y
> eliminar o desactivar las de demostración:
>
> ```sql
> DELETE FROM usuario WHERE username IN
>   ('admin','dra.rostova','dr.mendoza','dra.torres','recepcion','paciente');
> ```

**Desbloquear una cuenta tras 3 intentos fallidos (RF-6.2).** No hay
autoliberación por seguridad: la reactiva el administrador.

```sql
USE clinica_ojitos;
UPDATE usuario SET intentos_fallidos = 0, activo = 1
WHERE username = 'la_cuenta';
```

> Son credenciales de desarrollo local. Cámbialas antes de cualquier despliegue.

### Aislamiento de datos clínicos (RNF-01)

Un paciente **solo puede leer su propia ficha**. Los endpoints aceptan el
identificador en la URL (`/historiales/paciente/{id}`), que cualquiera podría
escribir a mano, así que la comprobación de pertenencia se hace en el servicio
(`AutorizacionPacienteService`), nunca en la pantalla:

| Rol | Ficha propia | Ficha ajena |
|---|---|---|
| `PACIENTE` | 200 | **403** |
| `OFTALMOLOGO` | 200 | 200 |
| `ADMINISTRADOR` | 200 | 200 |
| `RECEPCIONISTA` | — | **403** |

Recepción gestiona la agenda y el triaje, pero el historial clínico lo consulta
el profesional tratante. Cubierto por `AutorizacionPacienteServiceTest`.

### La clave de firma de los tokens

**El repositorio no publica ninguna clave JWT.** `application.yml` la deja
vacía a propósito y el backend genera una aleatoria al arrancar, avisando por
consola. Para un despliegue define una antes de arrancar:

```bash
export JWT_SECRET="$(openssl rand -base64 48)"
```

Si prefieres una clave fija para desarrollo, cualquier cadena de 32 caracteres
o más sirve; con menos, la aplicación se niega a arrancar.

---

## 4.b Ruta de aprendizaje

Si estás leyendo el proyecto por primera vez, sigue este orden. Cada paso
depende del anterior y evita que tengas que abrir veinte archivos.

### Paso 1 — Entiende el problema (10 min)

Lee la sección **1. Qué hace el sistema** de este README. Con eso ya sabes qué
resuelve el sistema, qué cinco módulos tiene y qué cuatro roles existen.

### Paso 2 — Mira la base de datos (20 min)

Abre `sql/01_esquema.sql` y recorre las secciones en orden. Los comentarios
explican **por qué** existe cada restricción, no qué hace.

Presta atención a dos cosas que son el corazón del modelo:

1. **`paciente.documento` es UNIQUE.** Es la regla RF1.2 en la base.
2. **`cita.slot_ocupado` es una columna generada.** Lee su comentario: es lo
   que impide que un médico tenga dos citas en el mismo horario *y* permite
   reutilizar el turno cuando una cita se cancela. Una sola restricción cubre
   los dos casos.

Después contrasta contra `sql/02_datos_prueba.sql` para ver datos reales de
cada tabla.

### Paso 3 — Sigue una petición de extremo a extremo (30 min)

Este es el paso clave. Traza **el alta de un paciente**:

```
frontend/src/app/features/pacientes/nuevo.html
        │  el usuario escribe el DNI
        ▼
PacienteService.buscarDocumento()          ← llama a /pacientes/existe-documento
        │
backend/.../controller/PacienteController.java
        │  @PreAuthorize + @Valid
        ▼
backend/.../domain/service/PacienteService.java
        │  aquí vive la regla: si el documento existe, lanza la excepción
        ▼
DocumentoDuplicadoException
        │
GlobalExceptionHandler                    ← la traduce a HTTP 409
        │
frontend                                  ← el formulario pinta el campo en rojo
```

Repite el ejercicio con una cita (`CitaService`) y una consulta
(`ConsultaService`). Con estos dos recorridos entiendes **toda** la arquitectura.

### Paso 4 — Aprende las piezas una por una (1 h)

En este orden, porque cada una depende de la anterior:

| # | Carpeta | Qué aprendes ahí |
|---|---|---|
| 1 | `backend/.../domain/entity/` | Cómo se mapea el modelo a las tablas |
| 2 | `backend/.../domain/dto/` | Por qué las entidades nunca salen a la API |
| 3 | `backend/.../domain/repository/` | JPQL y el acceso a datos |
| 4 | `backend/.../domain/service/` | **Las reglas de negocio — el corazón del sistema** |
| 5 | `backend/.../exception/` | Cómo un error de negocio llega al cliente como código HTTP |
| 6 | `backend/.../security/` | JWT, roles y el límite de intentos |
| 7 | `frontend/src/app/core/` | Cómo el frontend habla con la API sin conocerla |
| 8 | `frontend/src/app/shared/` | El design system y por qué no hay librerías de UI |
| 9 | `frontend/src/app/features/` | Una pantalla por requisito funcional |

`docs/ESTRUCTURA.md` tiene el detalle de cada una. `docs/FLUJO.md` tiene el
recorrido de cada pantalla con el endpoint que usa.

### Paso 5 — Lee las reglas del proyecto

`AGENTS.md` define qué se puede y qué no se puede cambiar aquí. Léelo antes de
tocar código: explica por qué el esquema solo crece, por qué las contraseñas
son BCrypt y por qué ocultar un botón no es autorizar.

### Paso 6 — Ejecuta las pruebas (10 min)

```bash
cd backend && mvnw test      # 19 pruebas de la capa de servicio
```

Las pruebas son la mejor documentación ejecutable: cada una explica una regla
de negocio con un ejemplo. `CitaServiceTest` es la más informativa porque
cubre el cruce de horarios, la cancelación y la reprogramación.

---

## 4.c Problemas frecuentes

| Síntoma | Causa | Solución |
|---|---|---|
| `JAVA_HOME no está definido correctamente` | La variable apunta a una carpeta que no existe | Corrígela en las variables de entorno y abre una terminal nueva |
| `'mvnw.cmd' no se reconoce` | PowerShell no ejecuta archivos de la carpeta actual | Usa `.\mvnw.cmd`, o simplemente `mvn` |
| `Access denied for user 'root'` | La clave de MySQL no coincide | Revisa `$env:DB_PASSWORD` |
| `Unknown database 'clinica_ojitos'` | No se ejecutó `01_esquema.sql` | Vuelve al paso 1 |
| `El operador '<' está reservado` | Redirección de bash en PowerShell | Usa `mysql -e "source archivo.sql"` |
| `Port 8080 already in use` | Ya hay un backend corriendo | Cierra el proceso anterior |
| El login dice *«Servidor no disponible»* | El backend no está arriba | Levántalo en el paso 2 |
| El login dice *«intento 1 de 3»* | Credenciales incorrectas de verdad | Usa `admin` / `admin123` |
| La pantalla queda en blanco al entrar | Falta el backend con `useMockApi: false` | Levanta MySQL y el backend |

---

## 5. La API REST

Prefijo base: `/api/v1`. Todas las respuestas son JSON. Las rutas que requieren
autenticación aceptan `Authorization: Bearer <token>`.

| RF | Módulo | Endpoints |
|---|---|---|
| — | Estado | `GET /api/v1/estado` |
| RF-06 | Autenticación | `POST /auth/login` · `POST /auth/refresh` · `GET /auth/me` · `POST /auth/recuperar-clave` |
| RF-01 | Pacientes | `GET,POST /pacientes` · `GET,PUT,DELETE /pacientes/{id}` · `GET /pacientes/buscar?documento=` · `GET /pacientes/existe-documento?documento=` |
| RF-02 | Historial | `GET,POST /historiales` · `GET /historiales/{id}` · `GET /historiales/paciente/{id}` · `GET /historiales/{id}/evolucion` · `POST /historiales/{id}/examenes` |
| RF-03 | Citas | `GET,POST /citas` · `GET /citas/{id}` · `PATCH /citas/{id}/reprogramar` · `PATCH /citas/{id}/cancelar` · `PATCH /citas/{id}/estado` · `GET /citas/agenda` · `GET /citas/disponibilidad` |
| RF-04 | Tratamientos | `GET,POST /tratamientos` · `GET /tratamientos/{id}` · `GET /tratamientos/paciente/{id}` · `PATCH /tratamientos/{id}/seguimiento` · `GET,POST /cirugias` |
| RF-05 | Médicos | `GET,POST /oftalmologos` · `GET,PUT,DELETE /oftalmologos/{id}` · `PATCH /oftalmologos/{id}/desactivar` · `GET,PUT /oftalmologos/{id}/horarios` |
| RNF-01 | Auditoría | `GET /admin/auditoria` |

### Códigos de error

| Excepción | HTTP | Cuándo ocurre |
|---|---|---|
| `RecursoNoEncontradoException` | 404 | El `id` solicitado no existe. |
| `DocumentoDuplicadoException` | 409 | El DNI ya está registrado (RF1.2). |
| `ColegiaturaDuplicadaException` | 409 | La colegiatura ya está registrada (RF5.2). |
| `CruceDeHorarioException` | 409 | El horario del oftalmólogo ya está ocupado (RF3.2). |
| `CredencialesInvalidasException` | 401 | Usuario o contraseña incorrectos. |
| `AccesoDenegadoException` | 403 | El rol no tiene permiso para la operación. |
| `OperacionInvalidaException` | 400 | La operación es incoherente con el estado del recurso. |
| `ArchivoInvalidoException` | 400 | El archivo adjunto no cumple el formato o el tamaño. |
| `MethodArgumentNotValidException` | 400 | El cuerpo no cumple las validaciones del DTO. |
| `HttpMessageNotReadableException` | 400 | El JSON recibido está mal formado. |
| `HttpMediaTypeNotSupportedException` | 415 | El cuerpo no se envió como `application/json`. |
| `DataIntegrityViolationException` | 409 | La base rechaza la escritura: es la barrera final de RF1.2, RF3.2 y RF5.2. |

Todas las respuestas de error comparten la misma forma:

```json
{
  "timestamp": "2026-10-14T05:23:00",
  "status": 409,
  "error": "Cruce de Horario",
  "message": "El oftalmólogo ya tiene una cita registrada en ese horario.",
  "path": "/api/v1/citas"
}
```

---

## 6. El frontend replica el prototipo de alta fidelidad

La interfaz implementa las 24 pantallas del prototipo documentado en la Fase 3
(sección 3.6), respetando su composición, su jerarquía visual y sus estados.

El sistema de diseño se centraliza en `src/styles/`:

| Token | Valor | Uso |
|---|---|---|
| `--color-primary` | `#1B3A5F` | Botones primarios, barra lateral activa |
| `--color-primary-hover` | `#24496F` | Estado hover |
| `--color-sidebar` | `#F1F5F9` | Fondo de la navegación lateral |
| `--color-bg` | `#F8FAFC` | Fondo de página |
| `--color-surface` | `#FFFFFF` | Tarjetas y superficies |
| `--color-border` | `#E2E8F0` | Bordes de tarjeta y campo |
| `--color-text` | `#0F172A` | Texto principal |
| `--color-text-muted` | `#64748B` | Texto secundario |
| `--color-danger` | `#DC2626` | Alertas de error y validaciones |
| `--radius` | `10px` | Tarjetas y botones |
| `--radius-sm` | `6px` | Campos de formulario |

Dos variantes de navegación lateral coexisten según el contexto: la compacta del
módulo de pacientes y la extendida del portal clínico con barra superior,
ambas presentes en el prototipo.

---

## 7. Correspondencia con las fases del proyecto

| Fase | Periodo | Contenido | Estado en este repositorio |
|---|---|---|---|
| 1. Inicio y planificación | Semana 1 | Definición del problema, alcance, objetivos | Documentado |
| 2. Análisis y diseño | Semanas 1–2 | RF-01…RF-06, RNF-01…RNF-05, casos de uso | Documentado |
| 3. Construcción del backend | Semanas 2–4 | Spring Boot, controladores, DI, TDD, API REST | Implementado |
| 4. Primer incremento (APF1) | Semana 5 | Backend integrado, endpoints, pruebas | Implementado |
| **5. Base de datos** | **Semanas 6–8** | **JPA, Hibernate, CRUD, JPQL, transacciones** | **`sql/` + entidades JPA** |
| **6. Seguridad** | **Semanas 9–10** | **Spring Security, roles, permisos, JWT** | **Implementado** |
| 7. Segundo incremento (APF2) | Semana 10 | Backend completo y seguro | Implementado |
| **8. Frontend** | **Semanas 11–13** | **Angular, componentes, SASS, rutas, formularios** | **Implementado** |
| 9. Integración | Semanas 13–15 | Consumo de API, autorización, autenticación, errores | Implementado |
| 10. Tercer incremento (APF3) | Semana 15 | Sistema web integrado | Implementado |
| 11. Pruebas y mejora | Semanas 16–17 | Comunicación frontend/backend, depuración | En curso |
| 12. Despliegue | Semana 18 | Servidores web, nube | Pendiente |

---

## 8. Requisitos no funcionales y cómo se cumplen

| RNF | Enfoque |
|---|---|
| **RNF-01** Seguridad | BCrypt para contraseñas, JWT stateless, control de acceso por rol, tabla de auditoría, TLS en despliegue. |
| **RNF-02** Usabilidad | Formularios reactivos con validación en tiempo real, wizards de 3 pasos, mensajes junto al campo, diseño responsivo. |
| **RNF-03** Rendimiento | Índices sobre documento, fecha de cita y paciente; paginación en historiales; caché de la agenda diaria. |
| **RNF-04** Disponibilidad | Health checks de Spring Boot, reinicio automático, respaldos periódicos de MySQL. |
| **RNF-05** Escalabilidad | Arquitectura en capas separable horizontalmente, columna `sede_id` ya presente para múltiples sedes. |

---

## 9. Pruebas

```bash
# Backend — pruebas unitarias de la capa de servicio
cd backend && mvnw test

# Frontend — pruebas unitarias
cd frontend && npm test
```

Las pruebas del backend cubren el camino feliz y las validaciones de negocio de
cada requisito: duplicidad de documento, cruce de horario, unicidad de
colegiatura, cancelación y reprogramación de citas.

---

## 10. Consultar la base de datos

```bash
mysql -u root -p clinica_ojitos
```

```sql
-- Agenda del día
SELECT * FROM v_agenda_diaria WHERE fecha = CURDATE();

-- Evolución de la presión intraocular de un paciente
SELECT * FROM v_evolucion_presion_intraocular WHERE paciente_id = 4 ORDER BY fecha;

-- Historial clínico completo
SELECT * FROM v_historial_clinico WHERE paciente_id = 4 ORDER BY fecha DESC;
```

---

## 11. Convenciones

- **Idioma** — El código escribe en español: clases, métodos, tablas y columnas.
  Los identificadores técnicos (`Request`, `Response`, `Service`) se mantienen
  en su forma habitual para no pelearse con el ecosistema.
- **Formato de fecha** — `yyyy-MM-dd` en JSON. Fechas sin hora en la base.
- **Códigos de catálogo** — Los enums viajan como `String` legible
  (`"GLAUCOMA"`, `"CONFIRMADA"`), nunca como ordinales.
- **Errores** — Se lanzan excepciones de negocio con nombre propio; el manejador
  global las traduce. Los controladores no construyen respuestas de error a mano.
- **Commits** — Un commit por fase y por requisito funcional.

---

## 12. Licencia y uso

Proyecto académico developed para la asignatura de **Desarrollo de Aplicaciones
Web** con Java / Spring Boot. Uso educativo.
