# Despliegue en Coolify (VPS)

Tutorial para publicar el sistema en tu VPS con Coolify. Son **3 recursos** en
el mismo proyecto y entorno: **MySQL → Backend → Frontend**. Todo el
despliegue se hace a mano desde el panel; el repositorio ya trae lo necesario:

| Archivo | Para qué |
|---|---|
| `backend/Dockerfile` | Compila y ejecuta el backend (Java 21) |
| `frontend/Dockerfile` + `frontend/nginx.conf.template` | Compila Angular y lo sirve con nginx; reenvía `/api` al backend |
| `.env.example` | Lista completa de variables (cópiala a *Shared Variables*) |
| `sql/*.sql` | Esquema y datos de la base |

```
Navegador ──HTTPS──► Frontend (nginx) ──/api──► Backend (Spring) ──► MySQL
 tu dominio            contenedor 1               contenedor 2       contenedor 3
```

El navegador solo habla con el frontend; nginx reenvía `/api` al backend por la
red interna de Coolify. Por eso **no hay problemas de CORS** y el backend no
necesita dominio público.

---

## 0. Antes de empezar

- [ ] El código está en GitHub (`denisaurio/clinica-ojitos`, rama `master`).
- [ ] Corriste las pruebas en local: `node testing/run-tests.mjs` → todo en verde.
- [ ] Tienes un dominio o subdominio apuntando a la IP del VPS (registro **A**),
      p. ej. `ojitos.tudominio.com`.
- [ ] Generaste un secreto JWT: `openssl rand -base64 48`

---

## 1. Shared Variables (todas tus variables en un solo lugar)

En Coolify: **Projects → tu proyecto → Shared Variables** (o *Environment →
Shared Variables* si quieres que sean solo de ese entorno).

Crea **una variable por línea de `.env.example`**, con tus valores reales:

| Variable | Valor de ejemplo |
|---|---|
| `DB_HOST` | *(se completa en el paso 2)* |
| `DB_PORT` | `3306` |
| `DB_NAME` | `clinica_ojitos` |
| `DB_USER` | *(paso 2)* |
| `DB_PASSWORD` | *(paso 2)* |
| `DB_URL` | `jdbc:mysql://${DB_HOST}:${DB_PORT}/${DB_NAME}?useSSL=false&allowPublicKeyRetrieval=true&serverTimezone=America/Lima` |
| `DB_POOL_SIZE` | `10` |
| `JWT_SECRET` | *(la que generaste, ≥ 32 caracteres)* |
| `JWT_EXPIRATION_MINUTES` | `60` |
| `SPRING_PROFILES_ACTIVE` | `prod` |
| `JPA_DDL_AUTO` | `validate` |
| `PORT` | `8080` |
| `APP_TIMEZONE` | `America/Lima` |
| `LOG_LEVEL_ROOT` / `LOG_LEVEL_APP` | `INFO` / `INFO` |
| `CORS_ALLOWED_ORIGINS` | `https://ojitos.tudominio.com` |
| `UPLOAD_MAX_FILE_SIZE` / `UPLOAD_MAX_REQUEST_SIZE` | `10MB` / `25MB` |
| `BACKEND_URL` | *(paso 4)* |
| `FRONTEND_PORT` | `80` |

> **Importante:** `DB_NAME` debe ser `clinica_ojitos`: los scripts de `sql/`
> usan ese nombre.

Luego, en **cada aplicación** (pasos 3 y 4), en *Environment Variables*, no
repitas los valores: referencia las compartidas con la sintaxis de Coolify:

```
DB_URL={{project.DB_URL}}
DB_USER={{project.DB_USER}}
JWT_SECRET={{project.JWT_SECRET}}
```

(`{{project.X}}` para variables del proyecto, `{{environment.X}}` para las del
entorno, `{{team.X}}` para las del equipo.) Repite para todas las del backend;
el frontend solo necesita `BACKEND_URL` y `FRONTEND_PORT`.

---

## 2. MySQL

1. **Projects → tu proyecto → + New → Database → MySQL** (versión 8).
2. Pon nombre de base `clinica_ojitos`. Deja **sin** exponer puerto público.
3. **Start**. Copia de su pantalla: *usuario*, *contraseña* y el **host interno**
   (el nombre o UUID del contenedor, p. ej. `a1b2c3d4e5`).
4. Vuelve a *Shared Variables* y rellena `DB_HOST`, `DB_USER` y `DB_PASSWORD`.

### Cargar el esquema y los datos

Los scripts hay que ejecutarlos **en este orden**:
`01_esquema.sql` → `02_datos_prueba.sql` → `04_cuentas_iniciales.sql` → `05_sedes.sql`.

**Opción A — desde la Terminal del contenedor MySQL** (Coolify → tu MySQL → *Terminal*).
Si el contenedor tiene `curl`:

```bash
for f in 01_esquema 02_datos_prueba 04_cuentas_iniciales 05_sedes; do
  curl -fsSL https://raw.githubusercontent.com/denisaurio/clinica-ojitos/master/sql/$f.sql \
    | mysql -u root -p"$MYSQL_ROOT_PASSWORD" --default-character-set=utf8mb4
done
```

**Opción B — desde tu PC** (si la A no funciona): en la configuración del MySQL
activa **Make it publicly available** con un puerto (p. ej. `3307`), y ejecuta:

```bash
mysql -h IP_DEL_VPS -P 3307 -u root -p --default-character-set=utf8mb4 < sql/01_esquema.sql
mysql -h IP_DEL_VPS -P 3307 -u root -p --default-character-set=utf8mb4 < sql/02_datos_prueba.sql
mysql -h IP_DEL_VPS -P 3307 -u root -p --default-character-set=utf8mb4 < sql/04_cuentas_iniciales.sql
mysql -h IP_DEL_VPS -P 3307 -u root -p --default-character-set=utf8mb4 < sql/05_sedes.sql
```

(En PowerShell usa `mysql ... -e "source sql/01_esquema.sql"`.) **Cuando termines,
desactiva el acceso público** del MySQL.

Verifica: `mysql ... -e "USE clinica_ojitos; SHOW TABLES;"` → deben salir 24 tablas.

---

## 3. Backend

1. **+ New → Application → Public Repository** (o *Private Repository (GitHub App)*).
2. Repositorio: `https://github.com/denisaurio/clinica-ojitos` · Rama: `master`.
3. **Build Pack: Dockerfile** · **Base Directory: `/backend`** · Dockerfile: `/Dockerfile`.
4. **Ports Exposes: `8080`**. Deja el dominio vacío (se usa solo por red interna).
5. **Environment Variables**: todas las del backend con `{{project.X}}` (paso 1).
   Desmarca *Build Variable* en las secretas (`DB_PASSWORD`, `JWT_SECRET`).
6. **Health Check** (opcional): ruta `/api/v1/estado`, puerto `8080`.
7. **Deploy**. En *Logs* debe aparecer `Started ClinicaOftalmologicaApplication`.
8. Anota el **nombre interno** del contenedor (el UUID que Coolify muestra en la
   pestaña *General* de la aplicación) → será `http://UUID:8080`.

> El backend debe estar en la **misma red/destino de Docker** que el frontend
> (por defecto lo está si ambos están en el mismo servidor y entorno).

---

## 4. Frontend

1. En *Shared Variables* define `BACKEND_URL=http://UUID_DEL_BACKEND:8080`.
2. **+ New → Application → Public Repository**, mismo repo y rama `master`.
3. **Build Pack: Dockerfile** · **Base Directory: `/frontend`**.
4. **Ports Exposes: `80`**.
5. **Domains**: `https://ojitos.tudominio.com` (Coolify emite el certificado
   Let's Encrypt solo).
6. **Environment Variables**: `BACKEND_URL={{project.BACKEND_URL}}` y
   `FRONTEND_PORT={{project.FRONTEND_PORT}}`.
7. **Deploy**.

---

## 5. URLs operativas (esto va en el informe)

| Qué | URL |
|---|---|
| Frontend | `https://ojitos.tudominio.com` |
| API (vía nginx) | `https://ojitos.tudominio.com/api/v1` |
| Estado de la API | `https://ojitos.tudominio.com/api/v1/estado` |
| Documentación Swagger | `https://ojitos.tudominio.com/swagger-ui.html`¹ |

¹ Swagger solo responde si nginx lo reenvía; la plantilla actual solo reenvía
`/api/` y `/uploads/`. Para verlo, entra al backend por su propio dominio
temporal o añade un `location /swagger-ui` y `/v3/api-docs` en
`frontend/nginx.conf.template`.

**Prueba final:** abre el frontend, inicia sesión y recorre un flujo completo
(crear paciente → reservar cita → registrar consulta).

---

## 6. Después del primer despliegue (seguridad)

- [ ] **Cambia la contraseña `admin123`** y las de las cuentas de demo
      (`Ojitos2026*`) — son credenciales de desarrollo (ver `sql/04_cuentas_iniciales.sql`).
- [ ] Usa un `JWT_SECRET` propio y largo; nunca el del ejemplo.
- [ ] `CORS_ALLOWED_ORIGINS` con tu dominio real, no `*`.
- [ ] Deja `SPRING_PROFILES_ACTIVE=prod` y `JPA_DDL_AUTO=validate`.
- [ ] MySQL sin puerto público.
- [ ] Revoca cualquier token de GitHub que hayas compartido por chat.

### Actualizar la aplicación

Haz `git push` y en Coolify pulsa **Redeploy** (o activa *Auto Deploy* con el
webhook de GitHub). Cambios de esquema: script nuevo `sql/07_...sql` ejecutado a mano.

---

## 7. Si algo falla

| Síntoma | Causa probable | Qué hacer |
|---|---|---|
| Backend: `Schema-validation: missing table` | No se cargaron los `sql/` | Repite el paso 2 |
| Backend: `Communications link failure` / `Unknown host` | `DB_HOST` incorrecto o MySQL apagado | Usa el host **interno** de MySQL, no la IP pública |
| Backend: `Access denied for user` | `DB_USER`/`DB_PASSWORD` distintos a los de MySQL | Copia de nuevo desde la pantalla de MySQL |
| Backend: aviso `JWT_SECRET no esta definido` | Variable vacía o no referenciada | Revisa `JWT_SECRET={{project.JWT_SECRET}}` |
| Frontend: `502 Bad Gateway` en `/api` | `BACKEND_URL` mal o backend caído / en otra red | Revisa el UUID y el puerto; mira los logs del backend |
| Login responde 401 con la clave correcta | Cuenta bloqueada (3 intentos) | `UPDATE usuario SET intentos_fallidos=0, activo=1 WHERE username='...';` |
| Pantalla en blanco al recargar una ruta | nginx sin fallback SPA | Verifica que `nginx.conf.template` se copió (`try_files ... /index.html`) |
| Cambié una variable y no hace efecto | Falta redeploy | Pulsa **Redeploy** (las variables se leen al arrancar) |
