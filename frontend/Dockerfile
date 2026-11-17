# =============================================================================
#  Frontend — Angular 20 servido por nginx
#  Coolify: Base Directory = /frontend  ·  Build Pack = Dockerfile  ·  Puerto 80
#  nginx reenvía /api al backend usando la variable BACKEND_URL.
# =============================================================================

# ---- Etapa 1: compilar ------------------------------------------------------
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build -- --configuration production

# ---- Etapa 2: servir --------------------------------------------------------
FROM nginx:1.27-alpine
# La imagen oficial aplica envsubst a /etc/nginx/templates/*.template al arrancar.
COPY nginx.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist/frontend/browser /usr/share/nginx/html
ENV FRONTEND_PORT=80 \
    BACKEND_URL=http://backend:8080
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD wget -qO- http://localhost:${FRONTEND_PORT}/ >/dev/null || exit 1
