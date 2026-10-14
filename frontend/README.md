# Frontend — Clínica Oftalmológica Ojitos

Interfaz en **Angular 20**: componentes *standalone*, Signals para el estado y
SCSS con variables propias. **Sin librerías de UI** — los componentes del design
system están escritos a mano para que coincidan con el prototipo.

La documentación completa del proyecto (instalación, rutas de aprendizaje,
referencia de la API) está en el [`README.md` raíz](../README.md). La
descripción carpeta por carpeta está en
[`docs/ESTRUCTURA.md`](../docs/ESTRUCTURA.md) y el recorrido por pantalla en
[`docs/FLUJO.md`](../docs/FLUJO.md).

---

## Cómo se ejecuta

```bash
npm install
npm start          # http://localhost:4200
```

Requiere el backend en `http://localhost:8080`: `proxy.conf.json` desvía las
llamadas a `/api` hacia ahí. Si prefieres trabajar sin base de datos, pon
`useMockApi: true` en `src/environments/environment.ts` y los datos salen de
`core/services/demo-data.service.ts`.

```bash
npm run build      # compila a dist/
npm test           # pruebas unitarias
```

### Cuentas

| Usuario | Contraseña | Rol |
|---|---|---|
| `admin` | `admin123` | Administrador |
| `dra.rostova` · `dr.mendoza` · `dra.torres` | `Ojitos2026*` | Oftalmólogo |
| `recepcion` | `Ojitos2026*` | Recepcionista |
| `paciente` | `Ojitos2026*` | Paciente |

En modo demostración se aceptan las mismas credenciales.

---

## Estructura

```
src/app/
├── core/          Lo que toca a la API
│   ├── models/        Interfaces TypeScript que reflejan los DTOs
│   ├── services/      10 servicios, uno por módulo
│   ├── guards/        authGuard (¿hay sesión?) y roleGuard (¿el rol sirve?)
│   └── interceptors/  Adjunta el token y trata los errores
├── shared/        Lo reutilizable entre pantallas
│   ├── components/    14 componentes del design system
│   ├── layout/        Sidebar y topbar: el armazón de la aplicación
│   ├── charts/        Gráficas en SVG puro
│   └── icons/         Registro de iconos SVG
├── layout/        Contenedor que une el armazón con el enrutado
└── features/      Una carpeta por requisito funcional
```

---

## Reglas del proyecto

**Los componentes nunca inyectan `HttpClient`.** Hablan con los servicios de
`core/services/`, y solo ellos conocen la API. Por eso cambiar el backend o la
URL base es tocar un solo archivo.

**Ningún componente define un color suelto.** Todo el estilo sale de las
variables SCSS de `src/styles/`. Si necesitas un color que no existe, se añade
ahí primero.

**El estado usa Signals**, no `BehaviorSubject`. Un `signal` es reactivo por
naturaleza y el guard se reevalúa solo cuando la sesión cambia.

**Las rutas se cargan de forma diferida** por módulo funcional, así que
Angular descarga un paquete solo cuando el usuario entra a esa sección.

---

## Detalles que no son evidentes

**`ui-button` declara su propiedad como `tipo`, no como `type`.** Escribir
`<ui-button type="submit">` no enlaza nada: el `<button>` interno queda en
`type="button"` y el formulario nunca se envía. Si un botón dentro de un
`<form>` no hace nada, revisa que diga `tipo="submit"`.

**El interceptor devuelve al login ante cualquier 401**, incluso en el propio
inicio de sesión. Por eso `LoginComponent` distingue un 401 real de un error de
conexión: un fallo de red muestra «Servidor no disponible» en ámbar y **no**
consume ninguno de los tres intentos de RF6.2.

**Las gráficas están hechas con `<svg>` a mano**, sin Chart.js ni similar. El
prototipo las muestra en un tamaño concreto y una dependencia extra sería más
peso que código; además el estilo hereda los mismos tokens del resto.

---

## Modo demostración

`src/environments/environment.ts`:

```ts
useMockApi: false   // false = API real (por defecto)
```

Con `true`, cada servicio devuelve datos de muestra desde
`core/services/demo-data.service.ts` en lugar de emitir llamadas HTTP, y el
login se resuelve en el navegador. Sirve para explorar la interfaz o preparar
una demo sin levantar MySQL ni el backend.

`environment.prod.ts` es el que se usa en `ng build`.