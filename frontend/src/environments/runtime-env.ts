/**
 * Lectura de la configuración de ejecución (`window.__env`).
 *
 * El archivo `public/env.js` se carga antes del bundle y define los valores en
 * tiempo de ejecución. Así un mismo build de Angular sirve para cualquier
 * entorno: el despliegue solo cambia variables, no recompila.
 *
 * Si `window.__env` no existe (por ejemplo en pruebas unitarias) se usan los
 * valores por defecto que pasa cada `environment*.ts`.
 */
export interface RuntimeEnv {
  production: boolean;
  useMockApi: boolean;
  apiUrl: string;
  /** URL pública de la aplicación (sirve para enlaces que se muestran al usuario). */
  appUrl: string;
  appName: string;
  appTagline: string;
}

declare global {
  interface Window {
    __env?: Partial<RuntimeEnv>;
  }
}

export function leerRuntimeEnv(valoresPorDefecto: RuntimeEnv): RuntimeEnv {
  const runtime = typeof window === 'undefined' ? undefined : window.__env;

  return {
    production: runtime?.production ?? valoresPorDefecto.production,
    useMockApi: runtime?.useMockApi ?? valoresPorDefecto.useMockApi,
    apiUrl: runtime?.apiUrl ?? valoresPorDefecto.apiUrl,
    appUrl: runtime?.appUrl ?? valoresPorDefecto.appUrl,
    appName: runtime?.appName ?? valoresPorDefecto.appName,
    appTagline: runtime?.appTagline ?? valoresPorDefecto.appTagline,
  };
}
