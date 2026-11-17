import { leerRuntimeEnv } from './runtime-env';

/**
 * Entorno de producción: habla con el backend Spring Boot real.
 *
 * Sustituye a `environment.ts` durante `ng build`. Los valores efectivos se
 * leen de `public/env.js` (`window.__env`), que el contenedor regenera a partir
 * de las variables de entorno: el build no contiene URLs fijas.
 */
export const environment = leerRuntimeEnv({
  production: true,
  useMockApi: false,
  apiUrl: '/api/v1',
  appName: 'Ojitos',
  appTagline: 'Gestión Clínica',
});
