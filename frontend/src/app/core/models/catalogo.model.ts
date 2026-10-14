/** Elemento de catálogo devuelto por los endpoints `/catalogo/*`. */
export interface CatalogoItem {
  id: number;
  codigo: string;
  nombre: string;
  activo: boolean;
}

export interface TipoConsulta extends CatalogoItem {
  duracionMinutos: number;
  color: string;
}

export interface Subespecialidad extends CatalogoItem {}

/** `TipoTratamiento` (el tipo del tratamiento) vive en `tratamiento.model.ts`. */
export interface TipoExamen extends CatalogoItem {}

export interface Seguro extends CatalogoItem {}

export interface CatalogoVacio {
  vacio: true;
}