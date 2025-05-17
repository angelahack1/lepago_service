import { Timestamp } from "mongodb";

export interface CatalogoTiposUsuario {
    id: string;
    nombre_tipo: string;
    fecha_cambio: Timestamp;
}

export const catalogo_estados_usuario: CatalogoTiposUsuario[] = [];