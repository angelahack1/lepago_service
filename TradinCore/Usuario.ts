import { Timestamp } from 'mongodb';

export interface Usuario {
    qr: string;
    alias: string;
    idc: string;
    estados: Array<string>;
    tipos: Array<string>;
    nombres: Array<string>;
    apellidos: Array<string>;
    edad: Number;
    emails: Array<string>;
    rfc: string;
    fecha_alta: Timestamp;
    fecha_cambio: Timestamp;
}

export const usuarios: Usuario[] = [];