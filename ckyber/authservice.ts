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
      console.log(`[${getFormattedTimestamp()}]`,'Autservice::constructor()...');
      console.log(`[${getFormattedTimestamp()}]`,'kem: ', AuthService.kem);
      console.log(`[${getFormattedTimestamp()}]`,'challengeHashes: ', AuthService.challengeHashes);
      console.log(`[${getFormattedTimestamp()}]`,'buffer: ', AuthService.buffer);
      console.log(`[${getFormattedTimestamp()}]`,'idc_counter_sarray_view: ', AuthService.idc_counter_sarray_view);
      console.log(`[${getFormattedTimestamp()}]`,'...Autservice::constructor()');
    }

    private async getNextIdcAtomically(): Promise<string> {
      console.log(`[${getFormattedTimestamp()}]`,'getNextIdcAtomically()...');
        const previousCounterValue = Atomics.add(AuthService.idc_counter_sarray_view, 0, 1);
        const idc = await this.getMillisecondsSince1900() + previousCounterValue;
        console.log(`[${getFormattedTimestamp()}]`,'...getNextIdcAtomically() idc: ', idc);
        return idc.toString();
    }

    public async registerUser(login_name: string, publicKey: any): Promise<[string | null, string | null]> {
      console.log(`[${getFormattedTimestamp()}]`,'registerUser()...');
        const dbService = new DBService();
        const db = await dbService.connect();
        if(!db) {
          throw new Error('Failed to connect to MongoDB');
        }
        Atomics.store(AuthService.idc_counter_sarray_view, 0, 0);
        console.log(`[${getFormattedTimestamp()}]`,'registerUser()->Registering user: ',login_name);
        const originalPublicKey = Buffer.from(publicKey, 'base64');
        const [ciphertext, sharedSecret] = await AuthService.kem.encap(originalPublicKey);
        if(!ciphertext || !sharedSecret) {
            console.error(`[${getFormattedTimestamp()}]`,'Encapsulation failed for that public key!');
            return [ null, null ];
        }
        var cipherTextEncoded = Buffer.from(ciphertext).toString('base64');
        console.log(`[${getFormattedTimestamp()}]`,'registerUser()->Ciphertext: ',cipherTextEncoded);
        const idc = await this.getNextIdcAtomically();
        const idcS = idc.toString();
        console.log(`[${getFormattedTimestamp()}]`,'registerUser()->About to register Crypto Assets with idcS: ', idcS);
        const crypto_assets_registered = await dbService.registerCryptoAssets(idcS, originalPublicKey.toString('base64'), sharedSecret.toString('base64'));
        console.log(`[${getFormattedTimestamp()}]`,'registerUser()->crypto_assets_registered: ', crypto_assets_registered);
        if(!crypto_assets_registered) {
          console.error(`[${getFormattedTimestamp()}]`,'Crypto assets not registered');
          return [ null, null ];
        }

        const usuario: Usuario = {
            qr: '01',
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
        
        const usuarioRegistered = await dbService.registerUsuario(usuario);
        if(!usuarioRegistered) {
          console.error(`[${getFormattedTimestamp()}]`,'User not registered');
          return [ null, null ];
        }
        console.log(`[${getFormattedTimestamp()}]`,'registerUser()->User Registered successfully');
        return [ cipherTextEncoded, idcS ];
    }

    public async genChallenge(login_name: string) {
      console.log(`[${getFormattedTimestamp()}]`,'Generating challenge for: ',login_name);
      const randomBytes = nodeCrypto.randomBytes(16).toString('hex');
      console.log(`[${getFormattedTimestamp()}]`,'Random bytes: ',randomBytes);
      AuthService.challengeHashes.set(login_name, randomBytes);
      return randomBytes;
    }

    public async getChallenge(login_name: string) {
      console.log(`[${getFormattedTimestamp()}]`,'Getting challenge hash for: ',login_name);
      if(!AuthService.challengeHashes.has(login_name)) {
        throw new Error(`User ${login_name} not found for challenge hash`);
      }
      return AuthService.challengeHashes.get(login_name);
    }

    public async checkChallengeHash(login_name: string, hashReceived: string) {
      console.log(`[${getFormattedTimestamp()}]`,'Checking challenge hash for: ',login_name);
      const challenge = await this.getChallenge(login_name);
      const pow = new ProofOfWork(challenge, 4);
      const { blockData, nonce, hash } = pow.mine();
      console.log(`[${getFormattedTimestamp()}]`,'Hash: ',hash);
      console.log(`[${getFormattedTimestamp()}]`,'Hash received: ',hashReceived);
      console.log(`[${getFormattedTimestamp()}]`,'Hash match: ',hash === hashReceived);
      return hash === hashReceived;
    }

    private async getMillisecondsSince1900(): Promise<string> {
      const millisecondsSince1970Epoch = new Date().getTime();
      const epoch1900Offset = new Date('1900-01-01T00:00:00Z').getTime();
      return (millisecondsSince1970Epoch - epoch1900Offset).toString();
    }
}

export default AuthService;