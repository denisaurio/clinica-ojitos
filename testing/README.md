# testing/ — pruebas por módulo

Aquí vive **todo** lo que verifica el sistema. Si la página falla, se corre un
solo comando y el reporte dice **qué módulo falla, cuánto tarda y de cuál depende**.

```bash
# desde la raíz del repo (necesita Java 21 y Node 20+)
node testing/run-tests.mjs                   # todo: backend + build del frontend
node testing/run-tests.mjs --modulo citas    # un solo módulo
node testing/run-tests.mjs --modulo citas,auth
node testing/run-tests.mjs --sin-frontend    # solo backend
node testing/run-tests.mjs --solo-reporte    # re-lee el último resultado sin ejecutar nada
```

Salida: tabla en consola (🟢 verde / 🔴 rojo) y `testing/reporte/index.html`
(ábrelo en Thorium). El código de salida es `1` si algo falla, útil para CI.

## Cómo leer el resultado

| Señal | Significado |
|---|---|
| 🟢 VERDE | Todas las pruebas del módulo pasan |
| 🔴 ROJO | Al menos una falla; se imprime cuál y por qué |
| ⚪ SIN DATOS | El módulo no tiene pruebas o no se ejecutó |
| ⚠ posible causa | El módulo está en rojo **y** otro del que depende también: arregla primero ese |
| ms | Suma del tiempo de las pruebas del módulo |

Si **todas** las pruebas de API fallan a la vez, el runner avisa: lo normal es que
la aplicación no arranca (entidad, bean o SQL incompatible con H2). Mira la
primera excepción en `backend/target/surefire-reports/*.txt`.

## Qué hay

```
testing/
├── run-tests.mjs        runner + reporte (sin dependencias, solo Node)
├── modulos.json         módulos, sus pruebas y de qué dependen
├── backend/java/        código de pruebas (Maven lo usa vía testSourceDirectory)
│   └── com/clinicaojitos/
│       ├── security/        JwtServiceTest              → módulo auth
│       ├── integracion/     *ApiTest + BaseIntegracionTest (app completa + H2)
│       ├── relaciones/      MapaDependenciasTest        → relaciones entre servicios
│       └── domain/service/  pruebas unitarias con Mockito (pacientes, citas, oftalmólogos)
└── reporte/             generado, no se versiona
```

| Módulo | Pruebas | Depende de |
|---|---|---|
| Catálogos | `CatalogoApiTest` | — |
| Autenticación y JWT | `JwtServiceTest`, `AuthApiTest` | — |
| Pacientes (RF-01) | `PacienteServiceTest`, `AutorizacionPacienteServiceTest`, `PacientesApiTest` | auth |
| Oftalmólogos (RF-05) | `OftalmologoServiceTest`, `OftalmologosApiTest` | catálogos, auth |
| Citas (RF-03) | `CitaServiceTest`, `CitasApiTest` | pacientes, oftalmólogos |
| Historial (RF-02) | `HistorialApiTest` | auth, pacientes |
| Tratamientos (RF-04) | `TratamientosApiTest` | auth, pacientes |
| Paneles y auditoría | `DashboardApiTest` | pacientes, citas, historial, tratamientos, auth |
| Relaciones | `MapaDependenciasTest` | — |

## Tipos de prueba

- **Unitarias** (Mockito, sin base de datos): reglas de negocio de cada servicio.
- **Integración** (`*ApiTest`): arrancan toda la aplicación con **H2 en memoria**
  (no necesitan MySQL) y llaman a los endpoints con MockMvc. Comprueban el
  cableado, el 401 sin token y el 403 por rol (RNF-01).
- **Relaciones** (`MapaDependenciasTest`): fija qué servicio usa a cuál y que no
  haya ciclos. Si añades una dependencia, falla y te dice cuál.
- **Frontend**: por ahora solo la prueba de humo `ng build` (que compile).

## Añadir pruebas de un módulo nuevo

1. Crea `XxxServiceTest` o `XxxApiTest` en `testing/backend/java/...`.
2. Añade el nombre de la clase al módulo en `modulos.json`.
3. Si el módulo usa otro servicio, actualiza `depende` y `MapaDependenciasTest`.

## Con Maven directo

```bash
cd backend && ./mvnw test                     # (.\mvnw.cmd en PowerShell)
./mvnw test -Dtest=CitaServiceTest            # una clase
```
