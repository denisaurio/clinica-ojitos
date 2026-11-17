/** Error de una respuesta HTTP no exitosa, con el cuerpo ya decodificado. */
export class ErrorHttp extends Error {
  constructor(metodo, ruta, status, cuerpo) {
    const detalle =
      typeof cuerpo === 'string'
        ? cuerpo
        : cuerpo?.message ?? cuerpo?.error ?? JSON.stringify(cuerpo);
    super(`${metodo} ${ruta} respondió ${status}${detalle ? `: ${detalle}` : ''}`);
    this.name = 'ErrorHttp';
    this.metodo = metodo;
    this.ruta = ruta;
    this.status = status;
    this.cuerpo = cuerpo;
  }
}

const METODOS_SIN_CUERPO = new Set(['GET', 'HEAD', 'DELETE']);

/**
 * Cliente HTTP mínimo sobre `fetch` (Node 18+). No usa dependencias externas.
 * Guarda el token JWT y lo adjunta a las peticiones autenticadas.
 */
export function crearCliente(configuracion) {
  const base = configuracion.baseUrl.replace(/\/$/, '');
  let token = null;

  async function solicitar(metodo, ruta, opciones = {}) {
    const {
      cuerpo,
      auth = true,
      permitirError = false,
      cabeceras = {},
      timeoutMs = configuracion.timeoutMs,
    } = opciones;

    const url = ruta.startsWith('http') ? ruta : `${base}${ruta.startsWith('/') ? '' : '/'}${ruta}`;
    const headers = { Accept: 'application/json', ...cabeceras };
    if (cuerpo !== undefined && !METODOS_SIN_CUERPO.has(metodo)) {
      headers['Content-Type'] = 'application/json';
    }
    if (auth && token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const control = new AbortController();
    const temporizador = setTimeout(() => control.abort(), timeoutMs);
    let respuesta;
    try {
      respuesta = await fetch(url, {
        method: metodo,
        headers,
        body: cuerpo === undefined || METODOS_SIN_CUERPO.has(metodo)
          ? undefined
          : JSON.stringify(cuerpo),
        signal: control.signal,
      });
    } catch (fallo) {
      if (fallo?.name === 'AbortError') {
        throw new Error(`Tiempo de espera agotado (${timeoutMs} ms) en ${metodo} ${ruta}`);
      }
      throw new Error(`No se pudo conectar con ${base}: ${fallo?.message ?? fallo}`);
    } finally {
      clearTimeout(temporizador);
    }

    const texto = await respuesta.text();
    let datos = null;
    if (texto) {
      try {
        datos = JSON.parse(texto);
      } catch {
        datos = texto;
      }
    }

    const resultado = {
      status: respuesta.status,
      ok: respuesta.ok,
      datos,
      cabeceras: respuesta.headers,
    };

    if (!respuesta.ok && !permitirError) {
      throw new ErrorHttp(metodo, ruta, respuesta.status, datos);
    }
    return resultado;
  }

  return {
    get: (ruta, opciones) => solicitar('GET', ruta, opciones),
    post: (ruta, cuerpo, opciones) => solicitar('POST', ruta, { ...opciones, cuerpo }),
    put: (ruta, cuerpo, opciones) => solicitar('PUT', ruta, { ...opciones, cuerpo }),
    patch: (ruta, cuerpo, opciones) => solicitar('PATCH', ruta, { ...opciones, cuerpo }),
    del: (ruta, opciones) => solicitar('DELETE', ruta, opciones),
    setToken(valor) {
      token = valor;
    },
    get token() {
      return token;
    },
    /** Copia del cliente con otro token, para probar roles distintos. */
    conToken(valor) {
      const copia = crearCliente(configuracion);
      copia.setToken(valor);
      return copia;
    },
  };
}

/** Inicia sesión y devuelve el `TokenResponse` del backend. */
export async function iniciarSesion(cliente, credenciales) {
  const respuesta = await cliente.post(
    '/auth/login',
    { username: credenciales.username, password: credenciales.password },
    { auth: false, permitirError: true }
  );
  if (!respuesta.ok) {
    throw new ErrorHttp('POST', '/auth/login', respuesta.status, respuesta.datos);
  }
  return respuesta.datos;
}
