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
            if (!this.client) {
                throw new Error('MongoDB client not initialized');
            }
            if (!this.db) {
                yield this.client.connect();
                this.db = this.client.db(this.dbName);
            }
            return this.db;
        });
    }
    close() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.client) {
                yield this.client.close();
            }
        });
    }
    isAliasRegistered(alias) {
        return __awaiter(this, void 0, void 0, function* () {
            const collection = this.db.collection(this.collectionNameUsuario);
            const result = yield collection.findOne({ alias: alias });
            return !!result;
        });
    }
    getLoginNameFromIdc(idc) {
        return __awaiter(this, void 0, void 0, function* () {
            const collection = this.db.collection(this.collectionNameUsuario);
            const result = yield collection.findOne({ idc: idc });
            return result ? result.alias : null;
        });
    }
    getSharedSecretFromIdc(idc) {
        return __awaiter(this, void 0, void 0, function* () {
            const collection = this.db.collection(this.collectionNameCryptoArtifacts);
            const result = yield collection.findOne({ idc: idc });
            if (!(result === null || result === void 0 ? void 0 : result.shared_secret)) {
                return null;
            }
            return Buffer.from(result.shared_secret, 'base64');
        });
    }
    getCatalogoEstadosUsuario() {
        return __awaiter(this, void 0, void 0, function* () {
            const collection = this.db.collection(this.collectionNameCatalogoEstadosUsuario);
            const result = yield collection.find({}).toArray();
            return result.map((iter) => iter.nombre_estado);
        });
    }
    getCatalogoTiposUsuario() {
        return __awaiter(this, void 0, void 0, function* () {
            const collection = this.db.collection(this.collectionNameCatalogoTiposUsuario);
            const result = yield collection.find({}).toArray();
            return result.map((iter) => iter.nombre_tipo);
        });
    }
    registerCryptoAssets(idcP, publicKey, sharedSecretEncoded) {
        return __awaiter(this, void 0, void 0, function* () {
            const collection = this.db.collection(this.collectionNameCryptoArtifacts);
            yield collection.insertOne({ idc: idcP, public_key: publicKey, shared_secret: sharedSecretEncoded });
        });
    }
    registerUsuario(usuario) {
        return __awaiter(this, void 0, void 0, function* () {
            const collection = this.db.collection(this.collectionNameUsuario);
            yield collection.insertOne(usuario);
        });
    }
    saveUserInfo(idcP, info) {
        return __awaiter(this, void 0, void 0, function* () {
            const collection = this.db.collection(this.collectionNameUsuario);
            yield collection.updateOne({ idc: idcP }, { $set: { info: info } });
        });
    }
}
exports.DBService = DBService;
