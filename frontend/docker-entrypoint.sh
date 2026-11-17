#!/bin/sh
# =============================================================================
#  Genera /usr/share/nginx/html/env.js en cada arranque del contenedor.
#
#  La imagen oficial de nginx ejecuta los scripts de /docker-entrypoint.d/
#  antes de iniciar nginx. Así el mismo build de Angular sirve para cualquier
#  entorno: el despliegue solo cambia variables, no recompila.
# =============================================================================
set -eu

DESTINO="/usr/share/nginx/html/env.js"

API_URL="${API_URL:-/api/v1}"
APP_URL="${APP_URL:-}"
APP_NAME="${APP_NAME:-Ojitos}"
APP_TAGLINE="${APP_TAGLINE:-Gestión Clínica}"

# Sanitiza los booleanos: solo se escribe true/false en el JavaScript.
case "${PRODUCTION:-true}" in
  true|false) PRODUCTION="${PRODUCTION:-true}" ;;
  *) PRODUCTION="true" ;;
esac
case "${USE_MOCK_API:-false}" in
  true|false) USE_MOCK_API="${USE_MOCK_API:-false}" ;;
  *) USE_MOCK_API="false" ;;
esac

# Escapa barras invertidas y comillas para que el valor sea un string válido.
escapar() {
  printf '%s' "$1" | sed 's/\\/\\\\/g; s/"/\\"/g'
}

cat > "$DESTINO" <<EOF
window.__env = {
  production: $PRODUCTION,
  useMockApi: $USE_MOCK_API,
  apiUrl: "$(escapar "$API_URL")",
  appUrl: "$(escapar "$APP_URL")",
  appName: "$(escapar "$APP_NAME")",
  appTagline: "$(escapar "$APP_TAGLINE")"
};
EOF

echo "[env.js] configuración generada (apiUrl=$API_URL)"
