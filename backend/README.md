# Backend — Clínica Oftalmológica Ojitos

API REST en **Spring Boot 3.4 + Java 21** con persistencia en **MySQL 8**
mediante JPA/Hibernate.

La documentación completa del proyecto (instalación, rutas de aprendizaje,
referencia de la API) está en el [`README.md` raíz](../README.md). La
descripción carpeta por carpeta está en
[`docs/ESTRUCTURA.md`](../docs/ESTRUCTURA.md) y el recorrido por pantalla en
[`docs/FLUJO.md`](../docs/FLUJO.md).

---

## Cómo se ejecuta

```bash
# Variables de entorno: nunca se versionan credenciales
export DB_URL=jdbc:mysql://localhost:3306/clinica_ojitos
export DB_USER=root
export DB_PASSWORD=tu_clave

mvnw spring-boot:run          # o: mvnw.cmd spring-boot:run   (Windows)
```

Queda disponible en `http://localhost:8080`:

| Ruta | Qué es |
|---|---|
| `/api/v1/estado` | Verificación de que la API está viva (pública) |
| `/swagger-ui.html` | Documentación interactiva de todos los endpoints |
| `/v3/api-docs` | Especificación OpenAPI en JSON |

```bash
mvnw test          # 19 pruebas unitarias de la capa de servicio
mvnw clean test    # compila desde cero y ejecuta las pruebas
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

**5. Las pruebas** — `src/test/java/`

Son la mejor documentación ejecutable: cada prueba explica una regla de
negocio con un ejemplo. `CitaServiceTest` es la más informativa porque cubre
el cruce de horarios, la cancelación y la reprogramación.

---

## Configuración

Todo se lee de variables de entorno con valores por defecto de desarrollo.

| Variable | Por defecto | Para qué |
|---|---|---|
| `DB_URL` | `jdbc:mysql://localhost:3306/clinica_ojitos` | Cadena de conexión |
| `DB_USER` | `root` | Usuario de MySQL |
| `DB_PASSWORD` | *(vacío)* | Clave de MySQL |
| `JWT_SECRET` | clave de desarrollo | Firma de los tokens |
| `JWT_EXPIRATION_MINUTES` | `60` | Vigencia del token |

Perfiles disponibles: `dev` (en `application-dev.yml`) permite que Hibernate
cree tablas faltantes; el perfil por defecto usa `ddl-auto: validate`, que
comprueba el esquema y **no lo modifica**.

> Antes de cualquier despliegue, cambia `JWT_SECRET` por una cadena aleatoria de
> 256 bits y las contraseñas de todas las cuentas.