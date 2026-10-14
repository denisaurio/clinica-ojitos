# Flujo de la aplicación

Cómo se usa el sistema desde que el usuario entra hasta que sale. Cada sección
describe un recorrido real, con las pantallas del prototipo entre paréntesis.

---

## 1. El recorrido completo en un diagrama

```
                    ┌──────────────────┐
                    │  /login          │  RF-06
                    │  Ingreso         │
                    └────────┬─────────┘
                             │ POST /auth/login  →  JWT
                             ▼
                    ┌──────────────────┐
                    │  ¿Guard de rol?  │
                    └──┬────┬────┬───┬──┘
          ADMIN.  ─────┘    │    │   └──────  PACIENTE
                            │    └──────────  RECEPCIONISTA
              OFTALMOLOGO ──┘
                             ▼
              ┌────────────────────────────┐
              │  Panel inicial por rol     │
              └────────────────────────────┘
                             │
        ┌────────────┬───────┼────────┬────────────┐
        ▼            ▼       ▼        ▼            ▼
   Pacientes     Citas   Historial Tratam.     Médicos
     RF-01        RF-03     RF-02     RF-04       RF-05
```

El sistema tiene **cuatro puertas de entrada distintas** según quién entre.
No es decoración: el guard del frontend oculta lo que no corresponde, y el
`@PreAuthorize` del backend lo impide de verdad.

| Rol | Lo que ve al entrar | Puede |
|---|---|---|
| `ADMINISTRADOR` | Resumen del Administrador | Todo: médicos, horarios, auditoría |
| `OFTALMOLOGO` | Agenda del día | Consultas, diagnósticos, tratamientos, cirugías |
| `RECEPCIONISTA` | Panel de recepción | Pacientes, agenda, triaje |
| `PACIENTE` | Portal de salud visual | Solo su propia información |

El menú lateral del administrador (`variante="operativo"`, en
`shared/layout/sidebar.ts`) muestra: **Resumen del Administrador**, Panel del
Especialista, Panel de Recepción, Pacientes, Citas e Historial Médico. Cada
entrada apunta a la ruta concreta del panel, no a `/dashboard`, para que el
enlace se mantenga resaltado al navegar.

---

## 2. Ingreso (3.6.19 · RF-06)

```
 /login
   │  Escribe usuario y contraseña
   │  El botón "Iniciar Sesión" se deshabilita mientras espera
   ▼
 POST /api/v1/auth/login  { username, password }
   │
   ├─ ¿Existe el usuario?            ── no ──► 401
   ├─ ¿Tiene menos de 3 fallos?      ── no ──► 401 "cuenta bloqueada"
   ├─ ¿La cuenta está activa?        ── no ──► 401
   └─ ¿La contraseña coincide?       ── no ──► 401 + suma un intento
   │
   ▼ sí
 200 { accessToken, rol, id, nombreCompleto, ... }
   │
   ▼
 El token se guarda en localStorage
 Se consulta GET /auth/me para el perfil
 El guard deja pasar y redirige al panel del rol
```

**Si la contraseña es incorrecta**, la tarjeta se pinta de rojo y muestra el
contador: *"Intento 1 de 3"* con una barra de progreso (pantalla 3.6.19). Al
tercer fallo la cuenta queda bloqueada. Para reactivarla desde la base:

```sql
UPDATE usuario SET intentos_fallidos = 0, activo = 1
WHERE username = 'la_cuenta';
```

> **Detalle de implementación.** El contador se escribe en una transacción
> aparte (`RegistroAccesoService`, con `REQUIRES_NEW`). Si se guardara dentro de
> la transacción del login, la excepción que se lanza después de incrementarlo
> la revertiría y la cuenta nunca se bloquearía.

Con la configuración por defecto (`useMockApi: false`) el login se resuelve
contra la API real y solo acepta las cuentas de la base de datos: `admin` con
`admin123`, y `recepcion`, `paciente`, `dra.rostova`, `dr.mendoza`, `dra.torres`
con `Ojitos2026*`.

Si pones `useMockApi: true` en `src/environments/environment.ts`, el login pasa
a resolverse en el navegador contra `demo-data.service.ts`, que acepta **las
mismas credenciales** para que puedas alternar entre ambos modos sin surprises.

> **Un fallo de conexión no cuenta como intento.** Si el backend está apagado,
> el login muestra «Servidor no disponible» en ámbar y **no** consume ninguno de
> los tres intentos: solo un 401 del servidor cuenta como intento fallido.

---

## 3. Pacientes (RF-01)

### 3.1 Buscar y listar (3.6.1)

```
 /pacientes
   │
   ├─ Carga:  GET /pacientes?buscar=&page=0&size=10
   │          Tabla paginada con nombre, DNI, edad, contacto y seguro
   │
   ├─ Escribe en el buscador  ──► GET /pacientes?buscar=...
   │          Filtra por nombre, apellido o DNI (parcial, no distingue mayúsculas)
   │
   ├─ Pagina  ──► GET /pacientes?page=2&...
   │
   └─ Sin resultados  ──►  Estado vacío (3.6.1)
                            "No se encontraron pacientes"
                            [Limpiar búsqueda]
```

### 3.2 Dar de alta (3.6.2) — asistente de 3 pasos

```
 /pacientes/nuevo
   │
   │  PASO 1 · Datos Personales
   │  nombres · apellidos · DNI · edad · teléfono · seguro
   │     │
   │     └─ al escribir el DNI ──► GET /pacientes/existe-documento?documento=
   │              │
   │              ├─ existe  ──► campo en ROJO
   │              │              "Este DNI ya está registrado."
   │              │              y el botón "Siguiente" se bloquea
   │              │
   │              └─ libre ────► campo en verde, se puede continuar
   │
   │  PASO 2 · Antecedentes
   │  historial ocular · alergias
   │
   │  PASO 3 · Confirmación
   │  resumen de todo lo escrito
   │
   ▼
 POST /api/v1/pacientes
   │
   ├─ Documento duplicado ──► 409 ──► vuelve al paso 1 con el mensaje
   ├─ Validación vacía     ──► 400 ──► marca los campos con error
   ▼
 201 Created ──► la pantalla pide iniciar sesión con el nuevo paciente
```

### 3.3 Ficha del paciente (3.6.3)

```
 /pacientes/perfil/:id
   │
   ├─ Cabecera: foto, nombre, ID, edad
   │             [Ver historial médico]  [Programar cita]
   │
   ├─ Izquierda: datos personales y cobertura
   │
   ├─ Derecha:   Antecedentes clínicos
   │             ┌──────────────┬──────────────┐
   │             │ Historial    │  ⚠ Alergias  │  ← recuadro ROJO
   │             │ ocular       │  Penicilina  │
   │             │              │  Latex       │
   │             └──────────────┴──────────────┘
   │
   └─ Actividad reciente: últimas consultas y exámenes con fecha y profesional
```

El recuadro de alergias es rojo a propósito: es la información que evita una
reacción adversa en consulta.

---

## 4. Historial médico (RF-02)

### 4.1 Línea de tiempo (3.6.5)

```
 /historial/paciente/:id
   │
   ├─ GET /historiales/paciente/:id
   │     Lista cronológica descendente de consultas
   │
   │  Cada tarjeta muestra:
   │    fecha y hora · especialista · título diagnóstico · notas clínicas
   │    [Ver informe]  [Imprimir]  [Descargar receta PDF]
   │
   ├─ Mientras carga: tarjetas skeleton
   └─ Al final: barra de paginación
```

### 4.2 Registrar una consulta (3.6.6)

```
 /historial/nueva-consulta?paciente=:id
   │
   │  ┌── SIGNOS VITALES ────────────────────────────┐
   │  │  Agudeza visual   OD [20/25]  OI [20/30]      │
   │  │  Presión intraocular OD [14]  OI [14] mmHg   │
   │  │  Pupilas · Biomicroscopía · Fondo de ojo      │
   │  └───────────────────────────────────────────────┘
   │  ┌── DIAGNÓSTICO ───────────────────────────────┐
   │  │  Diagnóstico *  ·  Código CIE-10 (H00–H59)   │
   │  │  Notas SOAP:  S │ O │ A │ P                  │
   │  └───────────────────────────────────────────────┘
   │  ┌── ADJUNTOS ──────────────────────────────────┐
   │  │  [Subir retinografía] [Subir OCT] [Subir PDF]│
   │  └───────────────────────────────────────────────┘
   ▼
 POST /api/v1/historiales
   │
   ├─ Diagnóstico obligatorio ──► 400 con el mensaje en el campo
   └─ Se guarda atribuido al oftalmólogo que está en sesión
   ▼
 201 ──► vuelve a la línea de tiempo con la consulta ya visible
```

La agudeza visual se valida con formato Snellen (`20/25`) y la PIO se valida
con Bean Validation contra un rango plausible.

### 4.3 Evolución de la presión intraocular (3.6.4)

```
 /historial/evolucion/:id
   │
   ├─ GET /historiales/paciente/:id/evolucion
   │     Solo las consultas que tienen medición de PIO
   │
   │  ┌── GRÁFICA ─────────────────────┬── DIAGNÓSTICO ──┐
   │  │  PIO OD  ··· línea punteada   │  Glaucoma       │
   │  │  PIO OI  ── línea continua    │  primario de    │
   │  │  eje: 10–18 mmHg              │  ángulo abierto │
   │  │  metas: OD ≤15   OI ≤14       │                 │
   │  └───────────────────────────────┤  PIO OBJETIVO   │
   │                                  │  TRATAMIENTO    │
   │                                  │  ACTIVO         │
   │                                  └─────────────────┘
   │  ┌── EVOLUCIÓN DE LA AGUDEZA VISUAL ─────────────────┐
   │  │  fecha │ OD │ OI │ observaciones                  │
   │  └───────────────────────────────────────────────────┘
```

Las dos líneas se leen juntas: si la de ojo derecho baja de la meta de 15
mmHg, el tratamiento está funcionando.

---

## 5. Citas (RF-03)

### 5.1 Agenda semanal (3.6.7)

```
 /citas/agenda
   │
   ├─ Selector de oftalmólogo  ──► GET /citas/disponibilidad?oftalmologoId=&fecha=
   │
   │  Columnas: LUN MAR MIÉ JUE VIE
   │  Filas:    una por hora (8 AM … 5 PM)
   │
   │  Cada bloque muestra:
   │    hora · tipo de procedimiento · paciente · estado
   │
   │  Los intervalos sin cita son huecos reales del horario del médico.
   │  La fila "Pausa para Almuerzo" bloquea 13:00–15:00.
   │
   └─ [Nueva Cita] ──► /citas/reservar
```

### 5.2 Reservar (3.6.9) — asistente de 3 pasos

```
 /citas/reservar
   │
   │  PASO 1 · Detalles
   │    Izquierda:  [Oftalmólogo ▼]   +  calendario del mes
   │    Derecha:    grilla de franjas, dividida en Mañana / Tarde
   │                cada franja dice FREE o BOOKED
   │                └── GET /citas/disponibilidad?oftalmologoId=&fecha=
   │
   │  PASO 2 · Datos del paciente
   │    busca o selecciona el paciente
   │
   │  PASO 3 · Confirmación
   │    resumen del turno elegido
   ▼
 POST /api/v1/citas
   │
   ├─ El horario ya está ocupado ──► 409
   │     "El oftalmólogo ya tiene una cita registrada en ese horario."
   │     (RF3.2 — la base también lo bloquea con un índice único)
   │
   ├─ hora_fin anterior a hora_inicio ──► 400
   ▼
 201 Created ──► /citas/confirmacion
```

### 5.3 Confirmación (3.6.10)

```
 /citas/confirmacion
   │
   ├─ Encabezado verde: turno registrado
   ├─ Fichas: paciente + nº historia · especialista + subespecialidad
   │          día y hora exactos
   ├─ Aviso: se enviaría la notificación por WhatsApp y correo
   └─ [Imprimir comprobante]   [Volver al calendario]
```

### 5.4 Reprogramar y cancelar (3.6.8)

```
 Modal de reprogramación
   ├─ Muestra el turno original como referencia
   ├─ Mini calendario para el nuevo día
   ├─ GET /citas/disponibilidad  ──► franjas del día elegido
   ├─ Campo de nota interna con el motivo del cambio
   ▼
 PATCH /api/v1/citas/:id/reprogramar { fecha, horaInicio, horaFin, notaInterna }
   │
   ├─ Si el nuevo horario está ocupado ──► 409
   └─ Si no: se guarda y el turno queda en PROGRAMADA

 Modal de cancelación  (patrón destructivo)
   ├─ Ícono de advertencia + "esta acción no se puede deshacer"
   └─ PATCH /api/v1/citas/:id/cancelar { motivo }
         └─ la cita pasa a CANCELADA y LIBERA el horario (bloqueo = 0)
```

---

## 6. Tratamientos (RF-04)

### 6.1 Prescripción (3.6.11)

```
 /tratamientos/prescripcion?paciente=:id
   │
   ├─ Contexto clínico: paciente vinculado + tratamiento crónico
   ├─ Selector por categoría: fármacos · prescripción óptica
   │                      terapias visuales · procedimientos quirúrgicos
   │
   │  Tarjeta de medicación:
   │    [buscar fármaco]  principio activo
   │    dosis por ojo      frecuencia    duración
   │    indicaciones especiales
   │
   ├─ [Agregar medicamento]  ──► se pueden encadenar varios en una sesión
   │
   ▼
 POST /api/v1/tratamientos
   │
   ├─ fecha_fin anterior a fecha_inicio ──► 400
   ▼
 201 ──► el tratamiento queda activo y aparece en la ficha del paciente
```

### 6.2 Seguimiento (3.6.12)

```
 /tratamientos/seguimiento/:id
   │
   ├─ Izquierda: resumen del caso
   │   paciente · diagnóstico · medicación activa · fecha de inicio
   │
   ├─ Centro: línea de tiempo de 6 meses
   │   cada control: Completado | Mejora de PIO | Sin Cambios | Pendiente
   │   [+ Añadir control]
   │
   ├─ Abajo: notas clínicas de la última revisión
   │   tolerancia al fármaco · mediciones · indicaciones
   │
   └─ Modal de cita de control (3.6.14)
        fecha · franjas libres/ocupadas · médico · notas preparatorias
```

Registrar un control actualiza automáticamente la fecha del próximo:

```
PATCH /api/v1/tratamientos/:id/seguimiento { fecha, resultado, pioOd, pioOi, observaciones }
```

### 6.3 Cirugía (3.6.13)

```
 /cirugias/registro
   │
   │  BLOQUE 1 · Paciente y diagnóstico preoperatorio (buscador)
   │  BLOQUE 2 · Variables técnicas
   │            tipo de cirugía · fecha programada · ojo · anestesia
   │  BLOQUE 3 · Detalle
   │            técnica · incidencias · modelo de LIO o injerto
   ▼
 POST /api/v1/tratamientos/cirugias
   ▼
 201 ──► la cirugía queda en el historial y puede asociarse a un tratamiento
```

---

## 7. Médicos (RF-05)

### 7.1 Directorio (3.6.15)

```
 /oftalmologos
   │
   ├─ Buscador predictivo: nombre · colegiatura · subespecialidad
   ├─ Tabla: identidad · correo · colegiado · área · estado
   │         (etiquetas de color: Activo / Inactivo)
   └─ Menú de tres puntos por fila:
         Editar credenciales · Reasignar turnos · Desactivar
```

### 7.2 Alta con validación en vivo (3.6.16)

```
 /oftalmologos/nuevo
   │
   ├─ Datos personales y contacto
   ├─ Credenciales: número de colegiatura + subespecialidad
   │
   │  al escribir la colegiatura ──► GET /oftalmologos/existe-colegiatura?numero=
   │       ├─ existe ──► ROJO, no deja guardar   (RF5.2)
   │       └─ libre  ──► puede continuar
   ▼
 POST /api/v1/oftalmologos
   │
   ├─ Colegiatura duplicada ──► 409
   └─ Alta correcta ──► 201
         + se crea automáticamente la cuenta de acceso del profesional
```

### 7.3 Horarios (3.6.17)

```
 /oftalmologos/horarios/:id
   │
   │  Cuadrícula de arrastrar y soltar: 7 días × franjas
   │
   │  Leyenda de colores:
   │    azul  → Consulta externa
   │    verde → Bloque quirúrgico
   │    gris  → Pausa / almuerzo
   │    blanco→ Fuera de turno
   │
   │  Tarjeta de resumen: total de horas asistenciales y quirúrgicas
   ▼
 PUT /api/v1/oftalmologos/:id/horarios  { horarios: [...] }
   │
   ├─ Reemplaza la matriz completa
   └─ hora_fin <= hora_inicio ──► 400
```

### 7.4 Perfil con métricas (3.6.18)

```
 /oftalmologos/perfil/:id
   │
   ├─ Identidad, subespecialidad, estado, correo, colegiado, turnos
   ├─ Tres tarjetas: pacientes atendidos · carga de la semana · satisfacción
   └─ Tabla de próximas citas: paciente · horario · tipo · confirmación
```

---

## 8. Los cuatro paneles

### Panel del administrador (3.6.21)

```
 /dashboard/admin
   ├─ Tres tarjetas: total de pacientes (+%) · citas de hoy · médicos activos
   ├─ Gráfica de barras: tendencia de volumen por día
   └─ Registro de accesos: usuario · IP · hora · resultado
        (verde EXITOSO / rojo FALLIDO)
```

### Panel del especialista (3.6.22)

```
 /dashboard/medico
   ├─ Agenda del día con el motivo de cada consulta
   ├─ Bloque lateral: tareas clínicas pendientes
   └─ Historiales consultados recientemente, para retomarlos
```

### Panel de recepción (3.6.23)

```
 /dashboard/recepcion
   ├─ [Registrar paciente] arriba a la izquierda, siempre visible
   ├─ Tabla de citas por franja: paciente · motivo · médico · estado
   │     (En Espera · Pendiente · En Consulta)
   │     acciones: registrar ingreso · abrir perfil
   ├─ Derecha: estado en vivo de los consultorios
   └─ Avisos operativos: equipos, trámites
```

### Portal del paciente (3.6.24)

```
 /dashboard/paciente
   │
   ├─ Saludo + distintivo "Sesión Protegida"
   ├─ Izquierda: próximas citas  (calendario · hora · médico · estado)
   │             [+ Programar Nueva Cita]
   ├─ Derecha:   historial con los diagnósticos vigentes
   │             y su fecha de última actualización
   └─ Mensajería segura con el equipo médico
```

El paciente **solo ve lo suyo**. La comprobación de pertenencia está en el
servicio del backend, no en el frontend: es la regla de seguridad de
`AGENTS.md` §5.1.

---

## 9. Los estados de una cita durante el día

```
   PROGRAMADA ──confirmar──► CONFIRMADA ──check-in──► EN_ESPERA
        │                        │                        │
        │                        │                   ──atender──► EN_CONSULTA
        │                        │                        │
        │                        │                  ──terminar──► COMPLETADA
        │                        │
        └──cancelar──────────────┴──────────────────► CANCELADA  (libera el turno)
                                                             
   Y en cualquier momento:  NO_ASISTIO
```

El cambio de estado se hace con:

```
PATCH /api/v1/citas/:id/estado  { estado: "EN_ESPERA" }
```

Pasar a `CANCELADA` libera automáticamente el horario. `NO_ASISTIO` es
distinto de `CANCELADA`: el turno se libera igual, pero significa que el
paciente no se presentó.

---

## 10. Resumen: qué endpoint usa cada pantalla

| Pantalla | Ruta | Endpoint principal |
|---|---|---|
| Login | `/login` | `POST /auth/login` |
| Recuperar clave | `/recuperar-clave` | `POST /auth/recuperar-clave` |
| Panel administrador | `/dashboard/admin` | `GET /dashboards/admin` |
| Panel especialista | `/dashboard/medico` | `GET /dashboards/medico` |
| Panel recepción | `/dashboard/recepcion` | `GET /dashboards/recepcion` |
| Portal paciente | `/dashboard/paciente` | `GET /dashboards/paciente` |
| Listar pacientes | `/pacientes` | `GET /pacientes` |
| Nuevo paciente | `/pacientes/nuevo` | `POST /pacientes` |
| Ficha paciente | `/pacientes/perfil/:id` | `GET /pacientes/:id` |
| Verificar DNI | — | `GET /pacientes/existe-documento` |
| Línea de tiempo | `/historial/paciente/:id` | `GET /historiales/paciente/:id` |
| Nueva consulta | `/historial/nueva-consulta` | `POST /historiales` |
| Evolución PIO | `/historial/evolucion/:id` | `GET /historiales/paciente/:id/evolucion` |
| Adjuntar examen | — | `POST /historiales/:id/examenes` |
| Agenda semanal | `/citas/agenda` | `GET /citas/agenda` |
| Reservar cita | `/citas/reservar` | `GET /citas/disponibilidad` + `POST /citas` |
| Confirmación | `/citas/confirmacion` | — |
| Reprogramar | `/citas/reprogramar/:id` | `PATCH /citas/:id/reprogramar` |
| Prescripción | `/tratamientos/prescripcion` | `POST /tratamientos` |
| Seguimiento | `/tratamientos/seguimiento/:id` | `PATCH /tratamientos/:id/seguimiento` |
| Cirugía | `/cirugias/registro` | `POST /tratamientos/cirugias` |
| Directorio médicos | `/oftalmologos` | `GET /oftalmologos` |
| Nuevo médico | `/oftalmologos/nuevo` | `POST /oftalmologos` |
| Horarios | `/oftalmologos/horarios/:id` | `PUT /oftalmologos/:id/horarios` |
| Perfil médico | `/oftalmologos/perfil/:id` | `GET /oftalmologos/:id/metricas` |
| Verificar colegiatura | — | `GET /oftalmologos/existe-colegiatura` |
| Auditoría | — | `GET /admin/auditoria` |
| Desplegables | — | `GET /catalogo` |

---

## 11. Después de usar el sistema

Cada dato clínico sensible que se toca queda registrado en la tabla
`auditoria`: quién accedió, desde qué IP, con qué navegador y a qué hora.
El administrador lo ve en su panel, y el detalle por paciente está en:

```
GET /api/v1/admin/auditoria/historial/:pacienteId
```

Cerrar sesión (`POST /auth/logout`) es responsabilidad del cliente: el token
es stateless y expira solo al cumplirse su vigencia. Para invalidarlo de
inmediato haría falta una lista de revocación en memoria, que no es necesaria
en el alcance del proyecto.