# AGENTS.md

Este archivo define **qué se puede hacer y qué no se puede hacer** en este
repositorio. Cualquier agente de IA — o cualquier persona trabajando
en él — debe leerlo antes de tocar un archivo.

Las reglas son obligatorias. Si una petición del usuario contradice este
archivo, gana el archivo: detente y pregunta antes de actuar.

---

## 0. TL;DR

| | |
|---|---|
| **Idioma del código** | Español |
| **Stack congelado** | Spring Boot 3.x + Java 21 + MySQL 8 + Angular 20 |
| **Scope del producto** | Solo oftalmología |
| **Alcance de cambios** | Solo dentro de este monorepo |
| **Bloqueante** | No borrar datos clínicos, no romper migraciones, no publicar credenciales |

---

## 1. Qué es este proyecto

Un sistema web de gestión para una clínica **exclusivamente de oftalmología**.
Su objetivo es el manejo de historiales clínicos oculares, no es un sistema de
salud general.

Define la frontera del dominio antes que cualquier detalle técnico.

---

## 2. Lo que SÍ puedes hacer

### 2.1 Backend (`backend/`)

- Añadir endpoints REST bajo `/api/v1`.
- Crear entidades JPA alineadas con las tablas de `sql/01_esquema.sql`.
- Escribir consultas JPQL con `@Query` en los repositorios.
- Implementar reglas de negocio en la capa de servicio, **siempre** como una
  excepción con nombre propio.
- Añadir endpoints de lectura agregada (dashboard, métricas, resumen).
- Escribir pruebas unitarias con JUnit 5 y Mockito.
- Añadir validaciones con Bean Validation (`jakarta.validation`).

### 2.2 Frontend (`frontend/`)

- Crear componentes Angular standalone con Signals.
- Replicar las pantallas del prototipo respetando el design system.
- Añadir rutas, guards de rol e interceptores.
- Crear servicios de API que consuman los endpoints existentes.
- Escribir estilos con SCSS usando **solo** los tokens definidos.

### 2.3 Base de datos (`sql/`)

- Añadir tablas, índices o vistas **mediante scripts incrementales** en
  `sql/04_` o posteriores.
- Añadir consultas de evidencia a `03_consultas.sql`.
- Ampliar los datos de prueba.

### 2.4 Documentación

- Actualizar `README.md` cuando cambien endpoints, rutas o el design system.
- Mantener la tabla de correspondencia con las fases al día.

---

## 3. Lo que NO puedes hacer

### 3.1 Prohibiciones absolutas

| # | Prohibición | Motivo |
|---|---|---|
| 1 | **No inventes dominios médicos.** | El alcance es oftalmología. No agregues odontología, pediatría general, cardiología ni ninguna otra especialidad. |
| 2 | **No borres ni migres datos clínicos existentes.** | `paciente`, `consulta`, `tratamiento` y `cirugia` contienen historia clínica. Nunca un `DROP TABLE` ni un `DELETE` masivo sobre ellas. |
| 3 | **No publiques credenciales.** | Ni contraseñas, ni tokens, ni claves. Todo va por variables de entorno. |
| 4 | **No cambies el stack tecnológico.** | Spring Boot, JPA, MySQL y Angular están decididos por el sílabo. No introduzcas otro framework, ORM o librería de UI. |
| 5 | **No inventes endpoints fuera de `/api/v1`.** | La convención de versionado es de la fase 2. |
| 6 | **No rompas el esquema sin un script incremental.** | Ver §3.3. |
| 7 | **No añadas campos de PHI sin motivo clínico.** | Solo los que un requisito funcional o el prototipo justifiquen. |

### 3.2 No rehagas lo que ya funciona

- No reescribas una capa completa porque «sería más limpia». Cambios quirúrgicos
  en un proyecto académico solo generan regresiones.
- No cambies firmas de métodos públicos sin actualizar todos los llamadores.
- Si un módulo ya cumple su RF, mejora sus tests, no su código.

### 3.3 Regla de oro: el esquema solo crece

`sql/01_esquema.sql` es la fuente de verdad del modelo de datos. Si necesitas
cambiarlo:

1. **Nunca edites un script ya ejecutado sobre una base existente** para
   "arreglar" cosas. Escribe un script nuevo y numerado: `sql/04_agregar_x.sql`.
2. Toda alteração debe ser **retrocompatible**: columnas nuevas con `NULL` o
   `DEFAULT`, nunca `NOT NULL` sin default sobre tablas con datos.
3. Toda columna nueva debe tener su `DEFAULT` o ser nullable.
4. Nunca elimines ni renombres una tabla o columna en uso: márcala como
   deprecada y elimínala en una fase posterior y acordada.

### 3.4 Qué hacer ante la duda

Si una tarea requiere saltarse una de estas reglas: **para, explica por qué la
regla existe y pide confirmación**. No lo ejecutes "porque parece más rápido".

---

## 4. Límites del dominio oftalmológico

El agente debe respetar estas fronteras de conocimiento clínico:

| Permitido | Prohibido |
|---|---|
| Agudeza visual Snellen (OD / OI) | Inventar escalas visuales no estandarizadas |
| Presión intraocular en mmHg (10–40) | Usar PIO fuera de rango plausible |
| Campos oftálmicos: `pio_od`, `agudeza_od`, `pupilas`, `biomicroscopia`, `fondo_ojo` | Agregar columnas de otras especialidades |
| Lateralesidad `OD` / `OI` / `AO` | Invertir la convención de la tabla `ojo` |
| Subespecialidades: Retina, Córnea, Glaucoma, Pediátrica, Catarata | Agregar subespecialidades no oftálmicas |
| Códigos CIE-10 de oftalmología (`H00–H59`) | Asignar códigos CIE de otra categoría |
| Fármacos oftálmicos (latanoprost, timolol, tobramicina…) | Recomendar posología al paciente |

**Regla clínica dura:** el sistema **registra** lo que el oftalmólogo indica. No
calcula dosis ni sugiere tratamientos, y jamás cuestiona al profesional. Si una
funcionalidad parece estar dando consejo médico, está mal diseñada.

---

## 5. Seguridad — reglas no negociables

### 5.1 Autenticación y autorización

- Las contraseñas se almacenan **siempre** con BCrypt. Nunca en texto plano,
  nunca con MD5, SHA-1 ni reversible.
- El JWT **nunca** contiene datos clínicos. Solo identidad, rol y expiración.
- El control de acceso se define en el backend. Ocultar un botón en Angular es
  cortesía visual, **no es autorización**.
- `PACIENTE` solo lee lo suyo. Una comprobación de pertenencia va **siempre** en
  el servicio, nunca solo en el controlador.

### 5.2 Datos sensibles

- Los endpoints que exponen historial clínico exigen rol `OFTALMOLOGO`,
  `ADMINISTRADOR` o el propio `PACIENTE` sobre su registro.
- Toda lectura del historial clínico genera un registro en `auditoria`.
- No escribas datos clínicos reales de personas en el código, los tests ni los
  commits. Los datos de prueba son ficticios.

### 5.3 Dependencias

- Antes de agregar una dependencia, comprueba que Spring Boot o Angular no la
  traen ya. Cada dependencia añadida es deuda de seguridad.
- Nunca degrades una dependencia para forzar un build.

---

## 6. Convenciones obligatorias

### 6.1 Backend

| Elemento | Convención |
|---|---|
| Paquete raíz | `com.clinicaojitos` |
| Capas | `controller` → `service` → `repository` → `entity` |
| DTOs | `record` inmutables, nunca entidades JPA expuestas directamente |
| Excepciones | Clase propia por regla de negocio, en el paquete `exception` |
| Errores HTTP | Solo los produce `GlobalExceptionHandler` |
| Transacciones | `@Transactional` en servicios que modifican datos |
| Consultas | JPQL por defecto; SQL nativo solo si es justificado |
| Nombres | Español para el dominio, inglés para lo técnico |
| Imports | Explícitos; nunca comodines |

**Prohibido** devolver una entidad JPA directamente desde un controlador. Se
expone un DTO. Esto evita acoplar la API al esquema y filtra datos por error.

### 6.2 Frontend

| Elemento | Convención |
|---|---|
| Componentes | Standalone, con Signals |
| Estado | Signals; `BehaviorSubject` solo si es imprescindible |
| Llamadas HTTP | Siempre a través de un servicio, nunca desde un componente |
| Estilos | SCSS con los tokens de `src/styles/`; nada de colores hex sueltos |
| Componentes | `PascalCase`; archivos en `kebab-case` |
| Formularios | Angular Reactive Forms con validación en tiempo real |
| Rutas | Lazy loading por módulo funcional |

### 6.3 Base de datos

- `utf8mb4` siempre; InnoDB siempre.
- Llaves foráneas explícitas con nombre `fk_<tabla>_<referencia>`.
- Índices sobre toda llave foránea y sobre los campos de búsqueda frecuente.
- Enums como tablas de catálogo, no como `ENUM` de MySQL.
- Comentarios `--` para explicar *por qué*, no *qué*.

---

## 7. Flujo de trabajo de un agente

1. **Leer** este archivo y el `README.md` antes de tocar nada.
2. **Ubicar** el requisito funcional (RF/RNF) que justifica el cambio. Si no
   existe, pregunta si la funcionalidad es nueva antes de añadirla.
3. **Verificar** el estado real del código: no asumas. Un archivo puede haber
   cambiado desde la última lectura.
4. **Cambiar** lo mínimo que resuelve el requisito.
5. **Verificar**: `mvnw test` y `npm run build` pasan.
6. **Documentar**: si cambió un endpoint, una ruta o un token, actualiza el
   `README.md`.
7. **Reportar con honestidad**: qué se cambió, qué se verificó y qué quedó
   pendiente. Nunca afirmes que algo funciona sin haberlo comprobado.

---

## 8. Definición de "terminado"

Una tarea está terminada cuando:

- [ ] Cumple el RF o RNF asociado, y solo ese.
- [ ] No introduce ninguna de las prohibiciones de §3.
- [ ] Compila y los tests pasan.
- [ ] El backend valida la entrada y autoriza el acceso.
- [ ] El frontend no llama `HttpClient` directamente desde un componente.
- [ ] Las reglas de negocio viven en el servicio, no en el controlador.
- [ ] El `README.md` está al día si cambió algo público.
- [ ] Está reportado con lo verificado y lo no verificado.

---

## 9. Mapa rápido del repositorio

| Ruta | Qué contiene | Quién lo toca |
|---|---|---|
| `sql/01_esquema.sql` | DDL completo. **Fuente de verdad del modelo.** | Solo con script incremental |
| `sql/02_datos_prueba.sql` | Datos demo, idempotente | Datos de prueba nuevos |
| `sql/03_consultas.sql` | Evidencia CRUD y JPQL de la fase 5 | Consultas nuevas |
| `backend/src/main/java/.../domain/entity` | Entidades JPA | Reflejar cambios de esquema |
| `backend/src/main/java/.../domain/service` | Reglas de negocio | Casi todo cambio funcional |
| `backend/src/main/java/.../controller` | Endpoints HTTP | Endpoints nuevos |
| `backend/src/main/java/.../security` | JWT y roles | Cambios de autorización |
| `frontend/src/styles` | Design system | Solo si cambia el prototipo |
| `frontend/src/app/features` | Pantallas por RF | Pantallas nuevas |
| `README.md` | Contrato funcional y técnico | Con cada cambio público |

---

## 10. Frase de cierre

> Este sistema maneja datos clínicos de personas reales en su uso final.
> Trátalo como si lo fuera: con cuidado, con trazabilidad y con respeto por
> quien depends de él para cuidar su vista.