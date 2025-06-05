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
exports.DBService = void 0;
const mongodb_1 = require("mongodb");
const timestamp_1 = require("../timestamp/timestamp");
class DBService {
    constructor(mongoUri) {
        this.dbName = 'lepago-trading-core';
        this.collectionNameUsuario = 'Usuario';
        this.collectionNameCatalogoEstadosUsuario = 'CatalogoEstadosUsuario';
        this.collectionNameCatalogoTiposUsuario = 'CatalogoTiposUsuario';
        this.collectionNameCryptoArtifacts = 'CryptoArtifacts';
        this.uri = mongoUri || process.env.MONGODB_URI || '';
        if (!this.uri) {
            throw new Error('MongoDB URI not found. Please provide it in constructor or set MONGODB_URI environment variable.');
        }
        this.client = new mongodb_1.MongoClient(this.uri);
    }
    connect() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.client) {
                yield this.client.connect();
                this.db = this.client.db(this.dbName);
                return this.db;
            }
            else {
                return null;
            }
        });
    }
    close() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.client) {
                yield this.client.close();
            }
            else {
                console.error(`[${(0, timestamp_1.getFormattedTimestamp)()}] Error closing MongoDB client.`);
            }
        });
    }
    isAliasRegistered(alias) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const collection = this.db.collection(this.collectionNameUsuario);
                const result = yield collection.findOne({ alias: alias });
                if (result === null) {
                    console.log(`[${(0, timestamp_1.getFormattedTimestamp)()}] Alias not found: ${alias}`);
                    return false;
                }
                else {
                    console.log(`[${(0, timestamp_1.getFormattedTimestamp)()}] Alias found: ${alias}`);
                    return true;
                }
            }
            catch (error) {
                console.error(`[${(0, timestamp_1.getFormattedTimestamp)()}] Error checking alias ${alias} in MongoDB:`, error);
                return false;
            }
        });
    }
    getLoginNameFromIdc(idc) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const collection = this.db.collection(this.collectionNameUsuario);
                const result = yield collection.findOne({ idc: idc });
                console.log("Alias from IDC: <", result ? result.alias : null, ">");
                return result ? result.alias : null;
            }
            catch (error) {
                console.error(`[${(0, timestamp_1.getFormattedTimestamp)()}] Error getting login name from IDC ${idc}:`, error);
                return null;
            }
        });
    }
    getSharedSecretFromIdc(idc) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const collection = this.db.collection(this.collectionNameCryptoArtifacts);
                const result = yield collection.findOne({ idc: idc });
                console.log("Shared secret from IDC: <", result ? result.shared_secret : null, ">");
                if (!(result === null || result === void 0 ? void 0 : result.shared_secret))
                    return null;
                const undecodedSharedSecret = Buffer.from(result.shared_secret, 'base64');
                return undecodedSharedSecret;
            }
            catch (error) {
                console.error(`[${(0, timestamp_1.getFormattedTimestamp)()}] Error getting shared secret from IDC ${idc}:`, error);
                return null;
            }
        });
    }
    getCatalogoEstadosUsuario() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const collection = this.db.collection(this.collectionNameCatalogoEstadosUsuario);
                const result = yield collection.find({}).toArray();
                return result.map((iter) => iter.nombre_estado);
            }
            catch (error) {
                console.error(`[${(0, timestamp_1.getFormattedTimestamp)()}] Error fetching catalogo estados usuario:`, error);
                return [];
            }
        });
    }
    getCatalogoTiposUsuario() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const collection = this.db.collection(this.collectionNameCatalogoTiposUsuario);
                const result = yield collection.find({}).toArray();
                return result.map((iter) => iter.nombre_tipo);
            }
            catch (error) {
                console.error(`[${(0, timestamp_1.getFormattedTimestamp)()}] Error fetching catalogo tipos usuario:`, error);
                return [];
            }
        });
    }
    registerCryptoAssets(idcP, publicKey, sharedSecret) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const collection = this.db.collection(this.collectionNameCryptoArtifacts);
                yield collection.insertOne({ idc: idcP, public_key: publicKey, shared_secret: sharedSecret });
            }
            catch (error) {
                console.error(`[${(0, timestamp_1.getFormattedTimestamp)()}] Error registering crypto assets:`, error);
                return false;
            }
            return true;
        });
    }
    registerUsuario(usuario) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const collection = this.db.collection(this.collectionNameUsuario);
                yield collection.insertOne(usuario);
            }
            catch (error) {
                console.error(`[${(0, timestamp_1.getFormattedTimestamp)()}] Error saving user in MongoDB:`, error);
                return false;
            }
            return true;
        });
    }
    //TODO: add a function to save the user info gotten from metaInfo encrypted with the shared secret
    saveUserInfo(idcP, info) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const collection = this.db.collection(this.collectionNameUsuario);
                yield collection.updateOne({ idc: idcP }, { $set: { info: info } });
            }
            catch (error) {
                console.error(`[${(0, timestamp_1.getFormattedTimestamp)()}] Error saving user info in MongoDB:`, error);
            }
        });
    }
}
exports.DBService = DBService;
