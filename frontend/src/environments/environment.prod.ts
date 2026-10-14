/**
 * Entorno de producción: talks to the real Spring Boot backend.
 * Sustituye a `environment.ts` durante `ng build`.
 */
export const environment = {
  production: true,
  useMockApi: false,
  apiUrl: '/api/v1',
  appName: 'Ojitos',
  appTagline: 'Gestión Clínica',
};