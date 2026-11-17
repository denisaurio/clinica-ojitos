/*
 * Configuración de ejecución del frontend.
 *
 * Este archivo se carga antes del bundle de Angular (ver index.html) y permite
 * cambiar los valores SIN recompilar. En Docker, `docker-entrypoint.sh` lo
 * regenera a partir de las variables de entorno del contenedor.
 *
 * En `ng serve` estos son los valores por defecto de desarrollo local.
 */
window.__env = window.__env || {
  production: false,
  useMockApi: false,
  apiUrl: '/api/v1',
  appName: 'Ojitos',
  appTagline: 'Gestión Clínica'
};
