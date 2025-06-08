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
const timestamp_1 = require("../timestamp/timestamp");
const db_access_1 = require("../db/db_access");
const proofofwork_1 = require("../pow/proofofwork");
const mongodb_1 = require("mongodb");
const nodeCrypto = __importStar(require("crypto"));
const mlkem_1 = require("mlkem");
class AuthService {
    constructor() {
        console.log(`[${(0, timestamp_1.getFormattedTimestamp)()}]`, 'Autservice::constructor()...');
        console.log(`[${(0, timestamp_1.getFormattedTimestamp)()}]`, 'kem: ', AuthService.kem);
        console.log(`[${(0, timestamp_1.getFormattedTimestamp)()}]`, 'challengeHashes: ', AuthService.challengeHashes);
        console.log(`[${(0, timestamp_1.getFormattedTimestamp)()}]`, 'buffer: ', AuthService.buffer);
        console.log(`[${(0, timestamp_1.getFormattedTimestamp)()}]`, 'idc_counter_sarray_view: ', AuthService.idc_counter_sarray_view);
        console.log(`[${(0, timestamp_1.getFormattedTimestamp)()}]`, '...Autservice::constructor()');
    }
    getNextIdcAtomically() {
        return __awaiter(this, void 0, void 0, function* () {
            console.log(`[${(0, timestamp_1.getFormattedTimestamp)()}]`, 'getNextIdcAtomically()...');
            const previousCounterValue = Atomics.add(AuthService.idc_counter_sarray_view, 0, 1);
            const idc = (yield this.getMillisecondsSince1900()) + previousCounterValue;
            console.log(`[${(0, timestamp_1.getFormattedTimestamp)()}]`, '...getNextIdcAtomically() idc: ', idc);
            return idc.toString();
        });
    }
    registerUser(login_name, publicKey) {
        return __awaiter(this, void 0, void 0, function* () {
            console.log(`[${(0, timestamp_1.getFormattedTimestamp)()}]`, 'registerUser()...');
            const dbService = new db_access_1.DBService();
            const db = yield dbService.connect();
            if (!db) {
                throw new Error('Failed to connect to MongoDB');
            }
            Atomics.store(AuthService.idc_counter_sarray_view, 0, 0);
            console.log(`[${(0, timestamp_1.getFormattedTimestamp)()}]`, 'registerUser()->Registering user: ', login_name);
            const originalPublicKey = Buffer.from(publicKey, 'base64');
            const [ciphertext, sharedSecret] = yield AuthService.kem.encap(originalPublicKey);
            if (!ciphertext || !sharedSecret) {
                console.error(`[${(0, timestamp_1.getFormattedTimestamp)()}]`, 'Encapsulation failed for that public key!');
                return [null, null];
            }
            var cipherTextEncoded = Buffer.from(ciphertext).toString('base64');
            console.log(`[${(0, timestamp_1.getFormattedTimestamp)()}]`, 'registerUser()->Ciphertext: ', cipherTextEncoded);
            const idc = yield this.getNextIdcAtomically();
            const idcS = idc.toString();
            console.log(`[${(0, timestamp_1.getFormattedTimestamp)()}]`, 'registerUser()->About to register Crypto Assets with idcS: ', idcS);
            const crypto_assets_registered = yield dbService.registerCryptoAssets(idcS, originalPublicKey.toString('base64'), sharedSecret.toString('base64'));
            console.log(`[${(0, timestamp_1.getFormattedTimestamp)()}]`, 'registerUser()->crypto_assets_registered: ', crypto_assets_registered);
            if (!crypto_assets_registered) {
                console.error(`[${(0, timestamp_1.getFormattedTimestamp)()}]`, 'Crypto assets not registered');
                return [null, null];
            }
            const usuario = {
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
                fecha_alta: new mongodb_1.Timestamp({ t: Math.floor(Date.now() / 1000), i: 1 }),
                fecha_cambio: new mongodb_1.Timestamp({ t: Math.floor(Date.now() / 1000), i: 2 })
            };
            const usuarioRegistered = yield dbService.registerUsuario(usuario);
            if (!usuarioRegistered) {
                console.error(`[${(0, timestamp_1.getFormattedTimestamp)()}]`, 'User not registered');
                return [null, null];
            }
            console.log(`[${(0, timestamp_1.getFormattedTimestamp)()}]`, 'registerUser()->User Registered successfully');
            return [cipherTextEncoded, idcS];
        });
    }
    genChallenge(login_name) {
        return __awaiter(this, void 0, void 0, function* () {
            console.log(`[${(0, timestamp_1.getFormattedTimestamp)()}]`, 'Generating challenge for: ', login_name);
            const randomBytes = nodeCrypto.randomBytes(16).toString('hex');
            console.log(`[${(0, timestamp_1.getFormattedTimestamp)()}]`, 'Random bytes: ', randomBytes);
            AuthService.challengeHashes.set(login_name, randomBytes);
            return randomBytes;
        });
    }
    getChallenge(login_name) {
        return __awaiter(this, void 0, void 0, function* () {
            console.log(`[${(0, timestamp_1.getFormattedTimestamp)()}]`, 'Getting challenge hash for: ', login_name);
            if (!AuthService.challengeHashes.has(login_name)) {
                throw new Error(`User ${login_name} not found for challenge hash`);
            }
            return AuthService.challengeHashes.get(login_name);
        });
    }
    checkChallengeHash(login_name, hashReceived) {
        return __awaiter(this, void 0, void 0, function* () {
            console.log(`[${(0, timestamp_1.getFormattedTimestamp)()}]`, 'Checking challenge hash for: ', login_name);
            const challenge = yield this.getChallenge(login_name);
            const pow = new proofofwork_1.ProofOfWork(challenge, 4);
            const { blockData, nonce, hash } = pow.mine();
            console.log(`[${(0, timestamp_1.getFormattedTimestamp)()}]`, 'Hash: ', hash);
            console.log(`[${(0, timestamp_1.getFormattedTimestamp)()}]`, 'Hash received: ', hashReceived);
            console.log(`[${(0, timestamp_1.getFormattedTimestamp)()}]`, 'Hash match: ', hash === hashReceived);
            return hash === hashReceived;
        });
    }
    getMillisecondsSince1900() {
        return __awaiter(this, void 0, void 0, function* () {
            const millisecondsSince1970Epoch = new Date().getTime();
            const epoch1900Offset = new Date('1900-01-01T00:00:00Z').getTime();
            return (millisecondsSince1970Epoch - epoch1900Offset).toString();
        });
    }
}
AuthService.kem = new mlkem_1.MlKem1024();
AuthService.challengeHashes = new Map();
AuthService.buffer = new SharedArrayBuffer(4);
AuthService.idc_counter_sarray_view = new Int32Array(AuthService.buffer);
exports.default = AuthService;
