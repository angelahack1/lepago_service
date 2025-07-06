import { getFormattedTimestamp } from '../timestamp/timestamp';
import { DBService } from '../db/db_access';
import { ProofOfWork } from '../pow/proofofwork';
import { Timestamp } from 'mongodb';
import type { Usuario } from '../TradinCore/Usuario';
import * as nodeCrypto from 'crypto';
import { MlKem1024 } from 'mlkem';

class AuthService {
    private static kem = new (MlKem1024 as any)();
    private static challengeHashes: Map<string, string> = new Map<string, string>();
    private static buffer = new SharedArrayBuffer(4);
    private static idc_counter_sarray_view: Int32Array = new Int32Array(AuthService.buffer);

    constructor() {
    }

    private async getNextIdcAtomically(): Promise<string> {
        const previousCounterValue = Atomics.add(AuthService.idc_counter_sarray_view, 0, 1);
        const idc = await this.getMillisecondsSince1900() + previousCounterValue;
        return idc.toString();
    }

    public async registerUser(login_name: string, publicKey: any): Promise<[string | null, string | null]> {
        const dbService = new DBService();
        await dbService.connect();
        Atomics.store(AuthService.idc_counter_sarray_view, 0, 0);
        const originalPublicKey = Buffer.from(publicKey, 'base64');
        const [ciphertext, sharedSecret] = await AuthService.kem.encap(originalPublicKey);
        if(!ciphertext || !sharedSecret) {
            throw new Error('Encapsulation failed for that public key!');
        }
        var cipherTextEncoded = Buffer.from(ciphertext).toString('base64');
        var sharedSecretEncoded = Buffer.from(sharedSecret).toString('base64');
        const idc = await this.getNextIdcAtomically();
        const idcS = idc.toString();
        await dbService.registerCryptoAssets(idcS, originalPublicKey.toString('base64'), sharedSecretEncoded);

        const usuario: Usuario = {
            qr: '01',
            qr_digest: '88976HDJGFGHJHB==',
            idc: idcS,
            alias: login_name,
            tipos: [],
            estados: ['Registrando'],
            cuentas: [],
            negocios: [],
            compras: [],
            nombres: [],
            apellidos: [],
            edad: 0,
            emails: [],
            rfc: "",
            fecha_alta: new Timestamp({ t: Math.floor(Date.now() / 1000), i: 1 }),
            fecha_cambio: new Timestamp({ t: Math.floor(Date.now() / 1000), i: 2 })
        };
        
        await dbService.registerUsuario(usuario);
        return [ cipherTextEncoded, idcS ];
    }

    public genChallenge(login_name: string): string {
      const randomBytes = nodeCrypto.randomBytes(16).toString('hex');
      AuthService.challengeHashes.set(login_name, randomBytes);
      return randomBytes;
    }

    public getChallenge(login_name: string): string {
      if(!AuthService.challengeHashes.has(login_name)) {
        throw new Error(`User ${login_name} not found for challenge hash`);
      }
      return AuthService.challengeHashes.get(login_name)!;
    }

    public checkChallengeHash(login_name: string, hashReceived: string): boolean {
      const challenge = this.getChallenge(login_name);
      const pow = new ProofOfWork(challenge, 4);
      const { hash } = pow.mine();
      return hash === hashReceived;
    }

    private getMillisecondsSince1900(): string {
      const millisecondsSince1970Epoch = new Date().getTime();
      const epoch1900Offset = new Date('1900-01-01T00:00:00Z').getTime();
      return (millisecondsSince1970Epoch - epoch1900Offset).toString();
    }
}

export default AuthService;