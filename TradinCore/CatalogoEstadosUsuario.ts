import { Timestamp } from "mongodb";

export interface CatalogoEstadosUsuario {
    id: string;
    nombre_estado: string;
    fecha_cambio: Timestamp;
}

export const catalogo_estados_usuario: CatalogoEstadosUsuario[] = [];