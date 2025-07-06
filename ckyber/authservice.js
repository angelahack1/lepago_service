"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const db_access_1 = require("../db/db_access");
const proofofwork_1 = require("../pow/proofofwork");
const mongodb_1 = require("mongodb");
const nodeCrypto = __importStar(require("crypto"));
const mlkem_1 = require("mlkem");
class AuthService {
    constructor() {
    }
    getNextIdcAtomically() {
        return __awaiter(this, void 0, void 0, function* () {
            const previousCounterValue = Atomics.add(AuthService.idc_counter_sarray_view, 0, 1);
            const idc = (yield this.getMillisecondsSince1900()) + previousCounterValue;
            return idc.toString();
        });
    }
    registerUser(login_name, publicKey) {
        return __awaiter(this, void 0, void 0, function* () {
            const dbService = new db_access_1.DBService();
            yield dbService.connect();
            Atomics.store(AuthService.idc_counter_sarray_view, 0, 0);
            const originalPublicKey = Buffer.from(publicKey, 'base64');
            const [ciphertext, sharedSecret] = yield AuthService.kem.encap(originalPublicKey);
            if (!ciphertext || !sharedSecret) {
                throw new Error('Encapsulation failed for that public key!');
            }
            var cipherTextEncoded = Buffer.from(ciphertext).toString('base64');
            var sharedSecretEncoded = Buffer.from(sharedSecret).toString('base64');
            const idc = yield this.getNextIdcAtomically();
            const idcS = idc.toString();
            yield dbService.registerCryptoAssets(idcS, originalPublicKey.toString('base64'), sharedSecretEncoded);
            const usuario = {
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
                fecha_alta: new mongodb_1.Timestamp({ t: Math.floor(Date.now() / 1000), i: 1 }),
                fecha_cambio: new mongodb_1.Timestamp({ t: Math.floor(Date.now() / 1000), i: 2 })
            };
            yield dbService.registerUsuario(usuario);
            return [cipherTextEncoded, idcS];
        });
    }
    genChallenge(login_name) {
        const randomBytes = nodeCrypto.randomBytes(16).toString('hex');
        AuthService.challengeHashes.set(login_name, randomBytes);
        return randomBytes;
    }
    getChallenge(login_name) {
        if (!AuthService.challengeHashes.has(login_name)) {
            throw new Error(`User ${login_name} not found for challenge hash`);
        }
        return AuthService.challengeHashes.get(login_name);
    }
    checkChallengeHash(login_name, hashReceived) {
        const challenge = this.getChallenge(login_name);
        const pow = new proofofwork_1.ProofOfWork(challenge, 4);
        const { hash } = pow.mine();
        return hash === hashReceived;
    }
    getMillisecondsSince1900() {
        const millisecondsSince1970Epoch = new Date().getTime();
        const epoch1900Offset = new Date('1900-01-01T00:00:00Z').getTime();
        return (millisecondsSince1970Epoch - epoch1900Offset).toString();
    }
}
AuthService.kem = new mlkem_1.MlKem1024();
AuthService.challengeHashes = new Map();
AuthService.buffer = new SharedArrayBuffer(4);
AuthService.idc_counter_sarray_view = new Int32Array(AuthService.buffer);
exports.default = AuthService;
