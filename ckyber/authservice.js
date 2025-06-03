"use strict";
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
const nodeCrypto = require('crypto');
const fs = require('fs');
const { MlKem1024 } = require('mlkem');
class AuthService {
    constructor() {
        console.log('Autservice::constructor()...');
        console.log('kem: ', AuthService.kem);
        console.log('challengeHashes: ', AuthService.challengeHashes);
        console.log('buffer: ', AuthService.buffer);
        console.log('idc_counter_sarray_view: ', AuthService.idc_counter_sarray_view);
        console.log('...Autservice::constructor()');
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
            if (!dbService.connect()) {
                throw new Error('Failed to connect to MongoDB');
            }
            Atomics.store(AuthService.idc_counter_sarray_view, 0, 0);
            console.log(`[${(0, timestamp_1.getFormattedTimestamp)()}]`, 'Registering user: ', login_name);
            const originalPublicKey = Buffer.from(publicKey, 'base64');
            const [ciphertext, sharedSecret] = yield AuthService.kem.encap(originalPublicKey);
            if (!ciphertext || !sharedSecret) {
                console.error(`[${(0, timestamp_1.getFormattedTimestamp)()}]`, 'Encapsulation failed for that public key!');
                return [null, null];
            }
            var cipherTextEncoded = Buffer.from(ciphertext).toString('base64');
            console.log(`[${(0, timestamp_1.getFormattedTimestamp)()}]`, 'Ciphertext: ', cipherTextEncoded);
            const idc = yield this.getNextIdcAtomically();
            const idcS = idc.toString();
            const crypto_assets_registered = yield dbService.registerCryptoAssets(idcS, originalPublicKey.toString('base64'), sharedSecret.toString('base64'));
            if (!crypto_assets_registered) {
                console.error(`[${(0, timestamp_1.getFormattedTimestamp)()}]`, 'Crypto assets not registered');
                return [null, null];
            }
            const usuario = {
                qr: '01',
                alias: login_name,
                idc: idcS,
                estados: ['Registrando'],
                tipos: [],
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
            console.log(`[${(0, timestamp_1.getFormattedTimestamp)()}]`, 'User Registered successfully');
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
AuthService.kem = new MlKem1024();
AuthService.challengeHashes = new Map();
AuthService.buffer = new SharedArrayBuffer(4);
AuthService.idc_counter_sarray_view = new Int32Array(AuthService.buffer);
exports.default = AuthService;
