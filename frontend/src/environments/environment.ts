/**
 * Entorno de desarrollo.
 *
 * `useMockApi` permite trabajar sin backend levantado: cuando es `true`, los
 * servicios de `core/services` devuelven datos de muestra desde
 * `demo-data.service.ts` en lugar de emitir llamadas HTTP.
 *
 * Está en `false`: el frontend consulta la API real y el panel del
 * administrador muestra los conteos vivos de la base de datos.
 * Vuelve a `true` solo si necesitas trabajar sin MySQL ni backend.
 *
 * En `ng build` (configuración `production`) Angular sustituye este fichero por
 * `environment.prod.ts`.
 */
export const environment = {
  production: false,
  useMockApi: false,
  apiUrl: '/api/v1',
  appName: 'Ojitos',
  appTagline: 'Gestión Clínica',
};