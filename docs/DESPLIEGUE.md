# Despliegue en Coolify (VPS)

Tutorial manual para publicar la Clínica Oftalmológica Ojitos en un VPS con
**Coolify** y tres servicios: **MySQL 8**, **API Spring Boot** y **Web Angular
+ nginx**.

El objetivo es un único dominio público:

```
https://app.midominio.com
        │
        ▼
   ┌─────────────┐        /api/*         ┌──────────────┐
   │  web        │ ────────────────────► │  api         │
   │  nginx:80   │   red interna Docker  │  Java:8080   │
   └─────────────┘                       └──────┬───────┘
                                                │ JDBC
                                         ┌──────▼───────┐
                                         │  mysql:8.4   │
                                         │  :3306       │
                                         └──────────────┘
```

El navegador **solo habla con el dominio web**. nginx sirve Angular y reenvía
`/api` al backend por la red privada de Docker. Por eso **no hace falta CORS**
en producción.

> Este documento es para que lo ejecutes tú, paso a paso. Ningún comando de
> este tutorial se ha ejecutado desde el repositorio: sustituye los valores de
> ejemplo por los tuyos.

---

## 0. Antes de empezar

Necesitas:

| Recurso | Mínimo recomendado |
|---|---|
| VPS | Ubuntu 22.04 / 24.04 LTS, 2 vCPU, 4 GB RAM, 40 GB SSD |
| Dominio | Un dominio o subdominio que puedas apuntar por DNS |
| Repositorio | `https://github.com/denisaurio/clinica-ojitos` |
| Local | Git, Node 18+ y, opcionalmente, un cliente MySQL |

Puertos que deben estar abiertos en el firewall del proveedor y del VPS:

- `22/tcp` — SSH
- `80/tcp` y `443/tcp` — proxy y certificados
- `8000/tcp` — panel de Coolify (puedes cerrarlo después)

No abras `3306`, `8080` ni `8081` a Internet.

---

## 1. Preparar DNS y secretos

### 1.1 DNS

Crea un registro **A** en tu proveedor de DNS:

| Tipo | Nombre | Valor | TTL |
|---|---|---|---|
| A | `app` | `IP_DEL_VPS` | 300 |

Espera a que propague:

```bash
nslookup app.midominio.com
```

Si usas Cloudflare, deja el registro en **DNS only** (nube gris) durante la
primera emisión del certificado. Después puedes activar el proxy con SSL
**Full (strict)**.

### 1.2 Generar secretos

Genera tres valores aleatorios y guárdalos en un lugar seguro:

```bash
# Contraseña del usuario de MySQL
openssl rand -base64 24

# Contraseña de root de MySQL
openssl rand -base64 24

# Firma de los JWT (mínimo 32 caracteres; recomendado 64)
openssl rand -base64 48
```

En Windows sin OpenSSL puedes usar Node:

```powershell
node -e "console.log(require('crypto').randomBytes(24).toString('base64'))"
node -e "console.log(require('crypto').randomBytes(48).toString('base64'))"
```

> El `JWT_SECRET` no se cambia después de desplegar salvo que quieras invalidar
> todas las sesiones. Un cambio obliga a todos los usuarios a volver a entrar.

---

## 2. Instalar Coolify en el VPS

Entra por SSH como `root`:

```bash
ssh root@IP_DEL_VPS
```

Ejecuta el instalador oficial:

```bash
curl -fsSL https://cdn.coollabs.io/coolify/install.sh | bash
```

Al terminar, el instalador imprime la URL del panel:

```
http://IP_DEL_VPS:8000
```

1. Abre esa URL.
2. Crea la cuenta de administrador **inmediatamente**.
3. Guarda una copia de `/data/coolify/source/.env` en un lugar seguro: contiene
   la clave con la que Coolify cifra sus datos.

Comprueba que el proxy responde:

```bash
docker ps --format 'table {{.Names}}\t{{.Status}}'
```

Debes ver `coolify` y `coolify-proxy` en estado `Up`.

---

## 3. Crear el proyecto y las Shared Variables

En el panel:

1. **New Project** → nombre `clinica-ojitos` → **Continue**.
2. Abre el proyecto y selecciona el entorno **production**.
3. En la barra lateral entra a **Shared Variables**.
4. Selecciona **Environment wide** → proyecto `clinica-ojitos` → entorno
   `production`.
5. Pega el siguiente bloque en **Developer view** y guarda.

```dotenv
# --- Aplicación ---------------------------------------------------------------
TZ=America/Lima
APP_TIMEZONE=America/Lima
APP_DOMAIN=app.midominio.com
APP_URL=https://app.midominio.com

# --- MySQL --------------------------------------------------------------------
MYSQL_DATABASE=clinica_ojitos
MYSQL_USER=clinica
MYSQL_PASSWORD=REEMPLAZA_CLAVE_MYSQL
MYSQL_ROOT_PASSWORD=REEMPLAZA_CLAVE_ROOT
MYSQL_PORT=3306

# --- Backend ------------------------------------------------------------------
SPRING_PROFILES_ACTIVE=prod
SERVER_PORT=8080
JPA_DDL_AUTO=validate
JPA_SHOW_SQL=false
JWT_EXPIRATION_MINUTES=480
JWT_SECRET=REEMPLAZA_SECRETO_JWT
CORS_ALLOWED_ORIGINS=

ADMIN_USERNAME=administrador
ADMIN_PASSWORD=REEMPLAZA_CLAVE_ADMIN
ADMIN_EMAIL=admin@clinicaojitos.pe
ADMIN_FORZAR_CLAVE=false

DB_URL=jdbc:mysql://REEMPLAZA_HOST_INTERNO:3306/clinica_ojitos?useSSL=false&allowPublicKeyRetrieval=true&serverTimezone=America/Lima
DB_USER=clinica
DB_PASSWORD=REEMPLAZA_CLAVE_MYSQL
DB_POOL_MAX=10
DB_POOL_MIN=2
DB_CONNECTION_TIMEOUT_MS=30000
DB_POOL_NAME=ClinicaOjitosPool

LOG_LEVEL_ROOT=INFO
LOG_LEVEL_APP=INFO
LOG_LEVEL_SECURITY=WARN
LOG_LEVEL_SQL=WARN
MULTIPART_MAX_FILE=10MB
MULTIPART_MAX_REQUEST=25MB

# --- Frontend -----------------------------------------------------------------
FRONTEND_PORT=8081
API_PROXY_TARGET=http://clinica-api:8080
PRODUCTION=true
USE_MOCK_API=false
API_URL=/api/v1
APP_NAME=Ojitos
APP_TAGLINE=Gestión Clínica
```

Reglas:

- `MYSQL_PASSWORD` y `DB_PASSWORD` deben ser **el mismo valor**.
- `DB_URL` se completa en el paso 4, cuando conozcas el host interno de MySQL.
  Deja el marcador por ahora.
- Marca como **Locked** `MYSQL_PASSWORD`, `MYSQL_ROOT_PASSWORD`, `DB_PASSWORD`,
  `JWT_SECRET` y `ADMIN_PASSWORD`.
- `CORS_ALLOWED_ORIGINS` se queda vacío: todo pasa por el mismo dominio.
  Si usas **dos subdominios** (frontend y backend separados), mira el paso 6.4.
- Si tu proyecto usa otro dominio, cambia `APP_DOMAIN` y `APP_URL`.
- `ADMIN_USERNAME` / `ADMIN_PASSWORD`: el backend crea esa cuenta
  `ADMINISTRADOR` al arrancar si no existe (clave de 8+ caracteres, en BCrypt).
  Úsala en producción en lugar de `admin/admin123`, que es pública. Si pierdes
  el acceso, pon `ADMIN_FORZAR_CLAVE=true`, reinicia el backend y vuelve a
  dejarla en `false`.

---

## 4. Servicio 1 — MySQL 8

### 4.1 Crear la base de datos

1. Dentro del proyecto: **New Resource** → **Databases** → **MySQL**.
2. Servidor: el mismo VPS.
3. Destino: la red por defecto (`coolify`).
4. En **General**, revisa y ajusta:

| Campo | Valor |
|---|---|
| Name | `clinica-ojitos-db` |
| Image | `mysql:8.4` (no uses 9.x: el esquema está probado en MySQL 8) |
| Initial database | `clinica_ojitos` |
| Normal username | `clinica` |
| Normal password | el valor de `MYSQL_PASSWORD` |
| Root password | el valor de `MYSQL_ROOT_PASSWORD` |
| Public port | **vacío** (sin acceso público) |

> **Importante:** el nombre de la base debe ser exactamente
> `clinica_ojitos`. Los scripts `sql/01_esquema.sql` y `sql/02_datos_prueba.sql`
> lo tienen escrito literalmente y el usuario de la aplicación solo tendrá
> privilegios sobre esa base.

5. Pulsa **Start** y espera a que el estado sea **running / healthy**.
6. En **General**, copia la **MySQL URL (internal)**. Se parece a:

```
mysql://clinica:CLAVE@a1b2c3d4e5-mysql:3306/clinica_ojitos
```

El host interno es la parte entre `@` y `:3306`, por ejemplo
`a1b2c3d4e5-mysql`.

7. Vuelve a **Shared Variables** y edita `DB_URL`:

```dotenv
DB_URL=jdbc:mysql://a1b2c3d4e5-mysql:3306/clinica_ojitos?useSSL=false&allowPublicKeyRetrieval=true&serverTimezone=America/Lima
```

Guarda el cambio.

> No publiques el puerto 3306. El backend y la web comparten la red interna de
> Coolify y no necesitan Internet para hablar con MySQL.

### 4.2 Cargar el esquema y los datos

Los scripts solo hay que ejecutarlos **una vez**, cuando la base está vacía.
Hazlo desde una sesión SSH en el VPS:

```bash
ssh root@IP_DEL_VPS

# 1. Trae el repositorio al VPS (solo la primera vez)
git clone https://github.com/denisaurio/clinica-ojitos.git /tmp/clinica-ojitos
# En actualizaciones posteriores: cd /tmp/clinica-ojitos && git pull

# 2. Localiza el contenedor de MySQL
docker ps --format '{{.Names}}\t{{.Image}}' | grep -i mysql
```

Copia el nombre de la primera columna y expórtalo:

```bash
export CONTENEDOR_MYSQL="a1b2c3d4e5-mysql"
```

Define una función que copia y ejecuta cada script con la contraseña de root
que ya está dentro del contenedor:

```bash
sql() {
  docker cp "/tmp/clinica-ojitos/sql/$1.sql" "$CONTENEDOR_MYSQL:/tmp/$1.sql" &&
  docker exec -i "$CONTENEDOR_MYSQL" \
    sh -c "mysql -uroot -p\"\$MYSQL_ROOT_PASSWORD\" --default-character-set=utf8mb4 < /tmp/$1.sql"
}
```

Ejecuta en este orden:

```bash
sql 01_esquema
sql 02_datos_prueba
sql 04_cuentas_iniciales
sql 05_sedes
```

Comprueba que la base quedó cargada:

```bash
docker exec -it "$CONTENEDOR_MYSQL" \
  sh -c 'mysql -uroot -p"$MYSQL_ROOT_PASSWORD" -e "USE clinica_ojitos; SHOW TABLES; SELECT COUNT(*) AS usuarios FROM usuario;"'
```

Debes ver las tablas (`usuario`, `paciente`, `cita`, `consulta`, …) y un conteo
de usuarios mayor que cero.

> `03_consultas.sql` es documentación de consultas de evidencia: no hace falta
> ejecutarlo en producción. `06_cambiar_rol.sql` se ejecuta solo cuando quieras
> cambiar el rol de una cuenta concreta.

---

## 5. Servicio 2 — Backend (API)

### 5.1 Crear la aplicación

1. **New Resource** → **Applications** → **Public Repository** (o el repositorio
   privado si lo conectaste con GitHub App).
2. Repositorio: `denisaurio/clinica-ojitos`.
3. Rama: `master` (o la rama que despliegues).
4. **Build Pack**: `Dockerfile`.
5. En **General**, revisa:

| Campo | Valor |
|---|---|
| Name | `clinica-ojitos-api` |
| Base Directory | `/backend` |
| Dockerfile Location | `Dockerfile` |
| Ports exposes | `8080` |
| Domain | **ninguno** (es privado) |
| Network Alias | `clinica-api` |

El **Network Alias** es lo que permite que nginx use
`http://clinica-api:8080` de forma estable entre despliegues.

### 5.2 Variables de entorno

Abre **Environment Variables** → **Developer view** y pega:

```dotenv
TZ={{environment.TZ}}
APP_TIMEZONE={{environment.APP_TIMEZONE}}
SPRING_PROFILES_ACTIVE={{environment.SPRING_PROFILES_ACTIVE}}
SERVER_PORT=8080

DB_URL={{environment.DB_URL}}
DB_USER={{environment.DB_USER}}
DB_PASSWORD={{environment.DB_PASSWORD}}
DB_POOL_MAX={{environment.DB_POOL_MAX}}
DB_POOL_MIN={{environment.DB_POOL_MIN}}
DB_CONNECTION_TIMEOUT_MS={{environment.DB_CONNECTION_TIMEOUT_MS}}
DB_POOL_NAME={{environment.DB_POOL_NAME}}

JPA_DDL_AUTO={{environment.JPA_DDL_AUTO}}
JPA_SHOW_SQL={{environment.JPA_SHOW_SQL}}
JWT_SECRET={{environment.JWT_SECRET}}
JWT_EXPIRATION_MINUTES={{environment.JWT_EXPIRATION_MINUTES}}
CORS_ALLOWED_ORIGINS={{environment.CORS_ALLOWED_ORIGINS}}
ADMIN_USERNAME={{environment.ADMIN_USERNAME}}
ADMIN_PASSWORD={{environment.ADMIN_PASSWORD}}
ADMIN_EMAIL={{environment.ADMIN_EMAIL}}
ADMIN_FORZAR_CLAVE={{environment.ADMIN_FORZAR_CLAVE}}

LOG_LEVEL_ROOT={{environment.LOG_LEVEL_ROOT}}
LOG_LEVEL_APP={{environment.LOG_LEVEL_APP}}
LOG_LEVEL_SECURITY={{environment.LOG_LEVEL_SECURITY}}
LOG_LEVEL_SQL={{environment.LOG_LEVEL_SQL}}
MULTIPART_MAX_FILE={{environment.MULTIPART_MAX_FILE}}
MULTIPART_MAX_REQUEST={{environment.MULTIPART_MAX_REQUEST}}
```

Si Coolify no resuelve una referencia, comprueba que el nombre coincida
exactamente y que la variable exista en el mismo entorno.

### 5.3 Healthcheck

En **Healthcheck**:

| Campo | Valor |
|---|---|
| Enabled | sí |
| Method | GET |
| Scheme | http |
| Host | `127.0.0.1` (o vacío) |
| Port | `8080` |
| Path | `/api/v1/estado` |
| Expected status | `200` |
| Interval | `30` s |
| Timeout | `10` s |
| Retries | `5` |
| Start period | `90` s |

La primera compilación descarga Maven y puede tardar varios minutos. Pulsa
**Deploy** y observa los logs.

Cuando termine, prueba desde el VPS usando el alias:

```bash
docker exec -it "$(docker ps --format '{{.Names}}' | grep -i api | head -n1)" \
  wget -qO- http://127.0.0.1:8080/api/v1/estado
```

Debe responder un JSON con `"estado":"ACTIVA"`.

### 5.4 Errores típicos del backend

| Log | Causa | Solución |
|---|---|---|
| `Communications link failure` | Host/puerto de MySQL incorrecto | Revisa `DB_URL` y que MySQL esté healthy |
| `Access denied for user` | Usuario o clave distintos | `DB_USER`/`DB_PASSWORD` = credenciales de Coolify |
| `Unknown database 'clinica_ojitos'` | La base no se creó con ese nombre | Recrea el recurso MySQL con `clinica_ojitos` |
| `Schema-validation: missing table` | No se ejecutó `01_esquema.sql` | Vuelve al paso 4.2 |
| `Table ... doesn't exist` | Faltan tablas o catálogos | Ejecuta `01`, `02`, `04` y `05` |
| `JWT secret ... too short` | `JWT_SECRET` vacío o corto | Genera uno de 64 caracteres y redeploy |

`JPA_DDL_AUTO=validate` es intencional: si el esquema no coincide, la API no
arranca en lugar de modificar tablas clínicas por su cuenta.

---

## 6. Servicio 3 — Frontend (Web)

### 6.1 Crear la aplicación

1. **New Resource** → **Applications** → mismo repositorio y rama.
2. **Build Pack**: `Dockerfile`.
3. En **General**:

| Campo | Valor |
|---|---|
| Name | `clinica-ojitos-web` |
| Base Directory | `/frontend` |
| Dockerfile Location | `Dockerfile` |
| Ports exposes | `80` |
| Domain | `https://app.midominio.com` |

4. En **Domains**, añade:

| Protocolo | Dominio | Puerto | Path |
|---|---|---|---|
| `https` | `app.midominio.com` | `80` (o vacío) | vacío |

La primera emisión del certificado puede tardar un minuto. Si falla, revisa
DNS y que `80`/`443` lleguen al VPS.

### 6.2 Variables de entorno

**Environment Variables** → **Developer view**:

```dotenv
TZ={{environment.TZ}}
API_PROXY_TARGET={{environment.API_PROXY_TARGET}}
API_URL={{environment.API_URL}}
APP_URL={{environment.APP_URL}}
APP_NAME={{environment.APP_NAME}}
APP_TAGLINE={{environment.APP_TAGLINE}}
PRODUCTION={{environment.PRODUCTION}}
USE_MOCK_API={{environment.USE_MOCK_API}}
```

`API_PROXY_TARGET` debe ser exactamente `http://clinica-api:8080`, **sin barra
final**. Si le agregas `/`, nginx puede perder el prefijo `/api`.

### 6.3 Healthcheck

| Campo | Valor |
|---|---|
| Enabled | sí |
| Method | GET |
| Scheme | http |
| Port | `80` |
| Path | `/healthz` |
| Expected status | `200` |
| Interval | `30` s |
| Timeout | `5` s |
| Retries | `3` |
| Start period | `20` s |

Pulsa **Deploy**.

> Cada arranque del contenedor regenera `env.js` con las variables actuales.
> Si cambias `APP_URL`, `APP_NAME` o `API_URL`, basta con **Restart**; no hace
> falta recompilar Angular.

### 6.4 Variante: dos subdominios (frontend y backend separados)

Es la configuración de producción de la clínica:

| Servicio | URL pública |
|---|---|
| Frontend (web) | `https://ojitos.hellosaurio.com` |
| Backend (api) | `https://api-ojitos.hellosaurio.com` · Swagger en `/swagger-ui.html` |

Diferencias con el despliegue de un solo dominio:

1. **DNS**: dos registros `A` al VPS, `ojitos` y `api-ojitos`.
2. **Backend** (paso 5.1): en **Domains** pon `https://api-ojitos.hellosaurio.com`
   (puerto `8080`) en vez de dejarlo privado.
3. **Shared Variables**:

   ```dotenv
   APP_DOMAIN=ojitos.hellosaurio.com
   APP_URL=https://ojitos.hellosaurio.com
   # El navegador llama directo al backend…
   API_URL=https://api-ojitos.hellosaurio.com/api/v1
   # …así que el backend debe aceptar el origen del frontend.
   CORS_ALLOWED_ORIGINS=https://ojitos.hellosaurio.com
   ```

4. `API_PROXY_TARGET` se mantiene (`http://clinica-api:8080`): nginx sigue
   reenviando `/api`, `/uploads` y Swagger, así que el frontend funciona aunque
   `API_URL` vuelva a ser `/api/v1`.

Comprobación rápida del CORS (debe devolver la cabecera con el dominio web):

```bash
curl -si -X OPTIONS https://api-ojitos.hellosaurio.com/api/v1/pacientes \
  -H "Origin: https://ojitos.hellosaurio.com" \
  -H "Access-Control-Request-Method: GET" | grep -i access-control-allow-origin
```

---

## 7. Verificación de punta a punta

Desde tu computadora:

```powershell
# 1. El frontend responde
Invoke-WebRequest https://app.midominio.com -UseBasicParsing | Select-Object StatusCode

# 2. El proxy /api llega al backend
Invoke-RestMethod https://app.midominio.com/api/v1/estado

# 3. El health check declara ACTIVA
(Invoke-RestMethod https://app.midominio.com/api/v1/estado).estado
```

En Linux/macOS:

```bash
curl -fsS https://app.midominio.com/healthz
curl -fsS https://app.midominio.com/api/v1/estado
```

Luego, en el navegador:

1. Abre `https://app.midominio.com`.
2. Inicia sesión con `admin` / `admin123`.
3. Comprueba que el panel carga indicadores.
4. Abre **Pacientes**, **Agenda** y **Tratamientos**.
5. Inicia sesión con un oftalmólogo demo y verifica que la agenda no queda
   vacía.

### Credenciales demo (solo para la primera entrega)

| Usuario | Clave | Rol |
|---|---|---|
| `admin` | `admin123` | Administrador |
| `dra.rostova` | `Ojitos2026*` | Oftalmóloga |
| `dr.mendoza` | `Ojitos2026*` | Oftalmólogo |
| `dra.torres` | `Ojitos2026*` | Oftalmóloga |
| `recepcion` | `Ojitos2026*` | Recepción |
| `paciente` | `Ojitos2026*` | Paciente |

> **Cámbialas antes de usar datos reales.** Puedes hacerlo desde la aplicación
> con `PATCH /api/v1/auth/cambiar-clave` (autenticado) o desde la interfaz de
> perfil si está disponible.

---

## 8. Ejecutar la suite de pruebas contra el despliegue

La suite está en `testing/` y no necesita instalar dependencias. Desde la raíz
del repositorio en tu máquina:

```powershell
$env:TEST_BASE_URL   = 'https://app.midominio.com/api/v1'
$env:TEST_ADMIN_USER = 'admin'
$env:TEST_ADMIN_PASSWORD = 'la-clave-real'
$env:TEST_WRITES     = 'false'   # primera pasada: solo lectura
node testing/run.mjs
```

Cuando la lectura pase, ejecuta la batería completa (crea datos `TEST` y los
limpia al final):

```powershell
$env:TEST_WRITES = 'true'
node testing/run.mjs
```

El informe muestra, por módulo:

- milisegundos que tardó,
- pruebas aprobadas / total,
- estado en **verde** (`OK`), **amarillo** (omisiones) o **rojo** (fallos),
- el mapa de relaciones entre módulos,
- el detalle de cada fallo.

Código de salida `1` si algo falló, para poder usarlo en CI.

También puedes ejecutar solo las comprobaciones estáticas, sin red:

```powershell
$env:TEST_MODE = 'contract'
node testing/run.mjs
```

Más detalles en [`testing/README.md`](../testing/README.md).

---

## 9. Actualizaciones

1. Haz commit y push de tus cambios (con autorización).
2. En Coolify, cada aplicación tiene **Automatic Deployment** si conectaste el
   webhook de GitHub; si no, pulsa **Redeploy** en la aplicación afectada.
3. Si el cambio incluye un script SQL nuevo (`sql/07_...sql`), ejecútalo en
   MySQL **antes** de desplegar el backend, usando la misma función `sql()` del
   paso 4.2.
4. Si cambiaste solo variables de entorno, usa **Restart**; si cambiaste
   código, **Redeploy**.

Orden recomendado:

```
MySQL (migración) → API → Web
```

La API arranca con `validate`: si el esquema está incompleto, falla rápido y
Coolify mantiene la versión anterior.

---

## 10. Respaldos

### Opción A — Respaldos de Coolify (recomendado)

En el recurso MySQL → **Backups**:

1. Activa el respaldo programado.
2. Elige frecuencia y retención (por ejemplo, diario, 7 días).
3. Opcionalmente configura un bucket S3.
4. Ejecuta un respaldo manual una vez y verifica que aparece en la lista.

### Opción B — `mysqldump` manual

Desde el VPS:

```bash
docker exec "$CONTENEDOR_MYSQL" \
  sh -c 'mysqldump -uroot -p"$MYSQL_ROOT_PASSWORD" \
  --single-transaction --routines --triggers clinica_ojitos' \
  > respaldo-clinica-$(date +%Y%m%d-%H%M).sql
```

Guarda ese archivo fuera del VPS. Un respaldo que solo vive en el mismo disco
no protege ante la pérdida del servidor.

### Restauración

```bash
docker exec -i "$CONTENEDOR_MYSQL" \
  sh -c 'mysql -uroot -p"$MYSQL_ROOT_PASSWORD" clinica_ojitos' \
  < respaldo-clinica-20261117-1200.sql
```

Prueba la restauración en una base de staging antes de necesitarla de verdad.

---

## 11. Seguridad después del despliegue

- [ ] Cambiar las contraseñas demo (`admin`, oftalmólogos, recepción, paciente).
- [ ] `JWT_SECRET` de al menos 64 caracteres y marcado como Locked.
- [ ] MySQL sin puerto público.
- [ ] API sin dominio público; solo accesible por la red interna.
- [ ] `CORS_ALLOWED_ORIGINS` vacío (mismo origen).
- [ ] HTTPS activo y renovación automática.
- [ ] Respaldos programados y probados.
- [ ] Panel de Coolify en `8000` cerrado al público o protegido por firewall.
- [ ] Logs sin contraseñas ni tokens.
- [ ] `JPA_DDL_AUTO=validate` (nunca `update` en producción).

---

## 12. Solución de problemas

### La web carga, pero `/api` devuelve 502

1. Revisa que la API esté **running** y **healthy**.
2. Entra a los **Runtime Logs** de la API.
3. Verifica que el alias `clinica-api` exista en **General → Network Aliases**.
4. Comprueba desde el contenedor web:

```bash
docker exec -it "$(docker ps --format '{{.Names}}' | grep -i web | head -n1)" \
  wget -qO- http://clinica-api:8080/api/v1/estado
```

Si eso falla, el problema es de red o de la API, no de nginx.

### La web carga, pero las llamadas van a `localhost:8080`

El `env.js` quedó con valores viejos. Reinicia el contenedor web y revisa los
logs de arranque: debe aparecer `[env.js] configuración generada`.

```bash
docker exec -it "$(docker ps --format '{{.Names}}' | grep -i web | head -n1)" \
  cat /usr/share/nginx/html/env.js
```

### `502` o `504` solo en `/api`

- `API_PROXY_TARGET` con barra final o con `https://` cuando el backend es HTTP.
- Backend escuchando en otro puerto: debe ser `8080`.
- Web y API en servidores distintos: el alias no cruza servidores. Usa un
  dominio público para la API o mueve ambos al mismo servidor.

### `Access denied` o `Unknown database`

Las credenciales de `DB_USER`/`DB_PASSWORD` deben coincidir con las del
recurso MySQL de Coolify. Si cambiaste la contraseña en MySQL, actualiza
también **General** del recurso y las Shared Variables, y redeploya la API.

### El certificado no se emite

- El registro DNS debe apuntar al VPS.
- Los puertos `80` y `443` deben llegar al proxy de Coolify.
- En Cloudflare, desactiva el proxy (nube gris) hasta que el certificado se
  emita; luego usa SSL **Full (strict)**.
- Revisa los logs de `coolify-proxy`.

### La API arranca pero el login devuelve 401 con las credenciales demo

Faltan los datos de prueba:

```bash
sql 02_datos_prueba
sql 04_cuentas_iniciales
```

### Las fechas salen corridas

Alinea `TZ`, `APP_TIMEZONE` y `serverTimezone` del `DB_URL` con
`America/Lima` (o tu zona real). Reinicia MySQL y la API después de cambiarlas.

### El contenedor web no arranca: `host not found in upstream`

`API_PROXY_TARGET` apunta a un host que no existe en la red. Confirma el alias
del backend y que ambos recursos estén en el mismo servidor y red.

---

## 13. Alternativa local: Docker Compose

El repositorio incluye `docker-compose.yml` con los mismos tres servicios para
probar en tu máquina antes de tocar el VPS.

```powershell
Copy-Item .env.example .env
# Edita .env: contraseñas, JWT_SECRET y API_PROXY_TARGET=http://api:8080
docker compose up -d --build
docker compose logs -f api
```

Accesos locales:

| Servicio | URL |
|---|---|
| Web | `http://localhost:8081` |
| API | `http://localhost:8080/api/v1/estado` |
| MySQL | `localhost:3306` (solo local) |

Los scripts de `sql/` se cargan automáticamente **solo la primera vez**, cuando
el volumen `clinica-ojitos-mysql-data` está vacío.

Para detener sin borrar datos:

```bash
docker compose down
```

Para reiniciar desde cero (destructivo, solo desarrollo):

```bash
docker compose down -v
```

---

## 14. Checklist final de entrega

- [ ] Los tres servicios están **running**.
- [ ] `https://app.midominio.com` abre con candado.
- [ ] `/api/v1/estado` responde `ACTIVA`.
- [ ] El login de administrador funciona.
- [ ] La agenda muestra la semana actual.
- [ ] Se puede reservar una cita y verla en la agenda.
- [ ] Se puede prescribir un tratamiento y registrar una cirugía.
- [ ] El paciente ve su propio historial y no el de otros.
- [ ] `node testing/run.mjs` termina sin fallos en rojo.
- [ ] Hay un respaldo descargado fuera del VPS.
- [ ] Las contraseñas demo fueron cambiadas.

---

## Anexo — Error `lstat …/backend/backend: no such file or directory`

El asistente de Coolify v4.7.5 guarda el Dockerfile como `backend/Dockerfile` y,
como el *Base directory* ya es `/backend`, la ruta se repite
(`/backend/backend/Dockerfile`). Coolify lo avisa con «Base directory is repeated».

Solución: en **Configuration → General → Build & deploy** deja

| Servicio | Base directory | Dockerfile location |
|---|---|---|
| Backend | `/backend` | `/Dockerfile` |
| Frontend | `/frontend` | `/Dockerfile` |

y comprueba que *Resolved file* muestre `/backend/Dockerfile` o `/frontend/Dockerfile`.
Guarda, recarga la página para verificar que se guardó y vuelve a desplegar.
