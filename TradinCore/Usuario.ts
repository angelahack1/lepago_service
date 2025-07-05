import { Timestamp } from 'mongodb';

export interface Usuario {
    qr: string;
    qr_digest: string;
    idc: string;
    alias: string;
    tipos: Array<string>;
    estados: Array<string>;
    cuentas: Array<string>;
    negocios: Array<string>;
    compras: Array<string>;
    nombres: Array<string>;
    apellidos: Array<string>;
    edad: Number;
    emails: Array<string>;
    rfc: string;
    fecha_alta: Timestamp;
    fecha_cambio: Timestamp;
}

export const usuarios: Usuario[] = [];