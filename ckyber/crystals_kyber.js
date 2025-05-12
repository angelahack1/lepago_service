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
const nodeCrypto = require('crypto');
const fs = require('fs');
const { MlKem1024 } = require('mlkem');
const { getFormattedTimestamp } = require('../timestamp/timestamp');
class AuthService {
    constructor() {
        this.idcs = [];
        this.publicKeys = [];
        this.sharedSecrets = [];
        this.challenges = [];
        this.challengeHashes = [];
        this.kem = new MlKem1024();
        const buffer = new SharedArrayBuffer(4);
        this.idc_counter_sarray_view = new Int32Array(buffer);
        Atomics.store(this.idc_counter_sarray_view, 0, 0);
    }
    getNextIdcAtomically() {
        const previousCounterValue = Atomics.add(this.idc_counter_sarray_view, 0, 1);
        const idc = this.getMillisecondsSince1900() + previousCounterValue;
        return idc;
    }
    registerUser(login_name, publicKey) {
        return __awaiter(this, void 0, void 0, function* () {
            console.log(`[${getFormattedTimestamp()}]`, 'Registering user: ', login_name);
            const originalPublicKey = Buffer.from(publicKey, 'base64');
            this.publicKeys.push({ login_name, originalPublicKey });
            const [ciphertext, sharedSecret] = yield this.kem.encap(originalPublicKey);
            this.sharedSecrets.push({ login_name, sharedSecret });
            let cipherTextEncoded = Buffer.from(ciphertext).toString('base64');
            console.log(`[${getFormattedTimestamp()}]`, 'Ciphertext: ', cipherTextEncoded);
            const idc = this.getNextIdcAtomically();
            this.idcs.push({ login_name, idc });
            return [cipherTextEncoded, idc];
        });
    }
    getLoginNameFromIdc(idc) {
        return __awaiter(this, void 0, void 0, function* () {
            const idcf = this.idcs.find(iter => iter.idc == idc);
            if (!idcf) {
                return null;
            }
            return idcf.login_name;
        });
    }
    getSharedSecret(login_name) {
        console.log(`[${getFormattedTimestamp()}]`, 'Getting shared secret for: ', login_name);
        const sharedSecret = this.sharedSecrets.find(iter => iter.login_name == login_name);
        if (!sharedSecret) {
            throw new Error(`User ${login_name} not found for shared secret`);
        }
        console.log(`[${getFormattedTimestamp()}]`, 'Shared secret: ', sharedSecret);
        return sharedSecret;
    }
    genChallenge(login_name) {
        console.log(`[${getFormattedTimestamp()}]`, 'Generating challenge for: ', login_name);
        const randomBytes = nodeCrypto.randomBytes(16).toString('hex');
        console.log(`[${getFormattedTimestamp()}]`, 'Random bytes: ', randomBytes);
        this.challenges.push({ login_name, challenge: randomBytes });
        return randomBytes;
    }
    registerIdc(login_name, idc) {
        console.log(`[${getFormattedTimestamp()}]`, 'Registering IDC for: ', login_name);
        this.idcs.push({ login_name, idc });
        console.log(`[${getFormattedTimestamp()}]`, 'IDC registered for: ', login_name);
    }
    registerChallengeHash(login_name, hash) {
        console.log(`[${getFormattedTimestamp()}]`, 'Registering challenge hash for: ', login_name);
        this.challengeHashes.push({ login_name, hash });
    }
    getIdc(login_name) {
        console.log(`[${getFormattedTimestamp()}]`, 'Getting IDC for: ', login_name);
        const idc = this.idcs.find(iter => iter.login_name == login_name);
        if (!idc) {
            throw new Error(`User ${login_name} not found for IDC`);
        }
        console.log(`[${getFormattedTimestamp()}]`, 'IDC: ', idc);
        return idc;
    }
    syncToIdcs() {
        console.log(`[${getFormattedTimestamp()}]`, 'Syncing IDCs to file');
        try {
            fs.writeFileSync('/home/node/app/idcs.json', JSON.stringify(this.idcs, null, 2));
            console.log(`[${getFormattedTimestamp()}]`, 'IDCs synced to file');
        }
        catch (error) {
            console.error(`[${getFormattedTimestamp()}]`, 'Error syncing IDCs to file: ', error);
        }
    }
    syncToFilePublicKeys() {
        console.log(`[${getFormattedTimestamp()}]`, 'Syncing Public Keys to file');
        try {
            fs.writeFileSync('/home/node/app/public_keys.json', JSON.stringify(this.publicKeys, null, 2));
            console.log(`[${getFormattedTimestamp()}]`, 'Public Keys synced to file');
        }
        catch (error) {
            console.error(`[${getFormattedTimestamp()}]`, 'Error syncing Public Keys to file: ', error);
        }
    }
    syncToFileSharedSecrets() {
        console.log(`[${getFormattedTimestamp()}]`, 'Syncing Shared Secrets to file');
        try {
            fs.writeFileSync('/home/node/app/shared_secrets.json', JSON.stringify(this.sharedSecrets, null, 2));
            console.log(`[${getFormattedTimestamp()}]`, 'Shared Secrets synced to file');
        }
        catch (error) {
            console.error(`[${getFormattedTimestamp()}]`, 'Error syncing Shared Secrets to file: ', error);
        }
    }
    syncToFileChallenges() {
        console.log(`[${getFormattedTimestamp()}]`, 'Syncing Challenges to file');
        try {
            fs.writeFileSync('/home/node/app/challenges.json', JSON.stringify(this.challenges, null, 2));
            console.log(`[${getFormattedTimestamp()}]`, 'Challenges synced to file');
        }
        catch (error) {
            console.error(`[${getFormattedTimestamp()}]`, 'Error syncing Challenges to file: ', error);
        }
    }
    syncToFileAll() {
        this.syncToFilePublicKeys();
        this.syncToFileSharedSecrets();
        this.syncToFileChallenges();
        this.syncToIdcs();
    }
    loadFromFilePublicKeys() {
        //Detect if public_keys.json exists
        if (fs.existsSync('/home/node/app/public_keys.json')) {
            this.publicKeys = JSON.parse(fs.readFileSync('/home/node/app/public_keys.json', 'utf8'));
            console.log(`[${getFormattedTimestamp()}]`, 'Loaded public keys from file');
            return true;
        }
        return false;
    }
    loadFromFileSharedSecrets() {
        //Detect if shared_secrets.json exists
        if (fs.existsSync('/home/node/app/shared_secrets.json')) {
            this.sharedSecrets = JSON.parse(fs.readFileSync('/home/node/app/shared_secrets.json', 'utf8'));
            console.log(`[${getFormattedTimestamp()}]`, 'Loaded shared secrets from file');
            return true;
        }
        return false;
    }
    loadFromFileChallenges() {
        //Detect if challenges.json exists
        if (fs.existsSync('/home/node/app/challenges.json')) {
            this.challenges = JSON.parse(fs.readFileSync('/home/node/app/challenges.json', 'utf8'));
            console.log(`[${getFormattedTimestamp()}]`, 'Loaded challenges from file');
            return true;
        }
        return false;
    }
    loadFromFileIdcs() {
        if (fs.existsSync('/home/node/app/idcs.json')) {
            this.idcs = JSON.parse(fs.readFileSync('/home/node/app/idcs.json', 'utf8'));
            console.log(`[${getFormattedTimestamp()}]`, 'Loaded idcs from file');
            return true;
        }
        return false;
    }
    loadFromFileAll() {
        console.log(`[${getFormattedTimestamp()}]`, 'Loading from file all, reanimation...');
        const response1 = this.loadFromFilePublicKeys();
        const response2 = this.loadFromFileSharedSecrets();
        const response3 = this.loadFromFileChallenges();
        const response4 = this.loadFromFileIdcs();
        console.log(`[${getFormattedTimestamp()}]`, 'Loading from file all, reanimation successful');
        return response1 && response2 && response3 && response4;
    }
    getMillisecondsSince1900() {
        const millisecondsSince1970Epoch = new Date().getTime();
        const epoch1900Offset = new Date('1900-01-01T00:00:00Z').getTime();
        return millisecondsSince1970Epoch - epoch1900Offset;
    }
}
module.exports = AuthService;
