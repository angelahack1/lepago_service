export interface Usuario {
    id: string;
    qr: string;
    alias: string;
    tipos: Array<string>;
    nombres: Array<string>;
    apellidos: Array<string>;
    crypto_assets: string;
    edad: Number;
    emails: Array<string>;
    rfc: string;
    fecha_alta: Date;
    fecha_cambio: Date;
    estados: Array<string>;
}

export const usuarios: Usuario[] = [];