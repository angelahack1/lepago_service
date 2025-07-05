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
            console.log(`[${(0, timestamp_1.getFormattedTimestamp)()}]`, 'connect()...');
            try {
                if (!this.client) {
                    console.error(`[${(0, timestamp_1.getFormattedTimestamp)()}] MongoDB client not initialized`);
                    return null;
                }
                if (!this.db) {
                    console.log(`[${(0, timestamp_1.getFormattedTimestamp)()}]`, 'connect()->Connecting to MongoDB...');
                    yield this.client.connect();
                    console.log(`[${(0, timestamp_1.getFormattedTimestamp)()}]`, 'connect()->Connected to MongoDB');
                    this.db = this.client.db(this.dbName);
                    console.log(`[${(0, timestamp_1.getFormattedTimestamp)()}]`, 'connect()->Database selected: ', this.dbName);
                }
                return this.db;
            }
            catch (error) {
                console.error(`[${(0, timestamp_1.getFormattedTimestamp)()}] Error connecting to MongoDB:`, error);
                return null;
            }
        });
    }
    close() {
        return __awaiter(this, void 0, void 0, function* () {
            console.log(`[${(0, timestamp_1.getFormattedTimestamp)()}]`, 'close()...');
            try {
                if (this.client) {
                    console.log(`[${(0, timestamp_1.getFormattedTimestamp)()}]`, 'close()->Closing MongoDB client...');
                    yield this.client.close();
                    console.log(`[${(0, timestamp_1.getFormattedTimestamp)()}]`, 'close()->MongoDB client closed');
                }
                else {
                    console.error(`[${(0, timestamp_1.getFormattedTimestamp)()}] Error closing MongoDB client.`);
                }
            }
            catch (error) {
                console.error(`[${(0, timestamp_1.getFormattedTimestamp)()}] Error closing MongoDB client:`, error);
            }
            console.log(`[${(0, timestamp_1.getFormattedTimestamp)()}]`, '...close()');
        });
    }
    isAliasRegistered(alias) {
        return __awaiter(this, void 0, void 0, function* () {
            console.log(`[${(0, timestamp_1.getFormattedTimestamp)()}]`, 'isAliasRegistered()...');
            console.log(`[${(0, timestamp_1.getFormattedTimestamp)()}]`, 'isAliasRegistered()->Alias: <', alias, ">");
            try {
                const collection = this.db.collection(this.collectionNameUsuario);
                const result = yield collection.findOne({ alias: alias });
                if (result === null) {
                    console.log(`[${(0, timestamp_1.getFormattedTimestamp)()}]`, 'isAliasRegistered()->Alias not found: <', alias, ">");
                    return false;
                }
                else {
                    console.log(`[${(0, timestamp_1.getFormattedTimestamp)()}]`, 'isAliasRegistered()->Alias found: <', alias, ">");
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
            console.log(`[${(0, timestamp_1.getFormattedTimestamp)()}]`, 'getLoginNameFromIdc()...');
            try {
                const collection = this.db.collection(this.collectionNameUsuario);
                const result = yield collection.findOne({ idc: idc });
                console.log(`[${(0, timestamp_1.getFormattedTimestamp)()}]`, 'getLoginNameFromIdc()->Alias from IDC: <', result ? result.alias : null, ">");
                return result ? result.alias : null;
            }
            catch (error) {
                console.error(`[${(0, timestamp_1.getFormattedTimestamp)()}] Error getting login name from IDC ${idc}:`, error);
                console.log(`[${(0, timestamp_1.getFormattedTimestamp)()}]`, '...getLoginNameFromIdc() error');
                return null;
            }
            console.log(`[${(0, timestamp_1.getFormattedTimestamp)()}]`, '...getLoginNameFromIdc() success');
        });
    }
    getSharedSecretFromIdc(idc) {
        return __awaiter(this, void 0, void 0, function* () {
            console.log(`[${(0, timestamp_1.getFormattedTimestamp)()}]`, 'getSharedSecretFromIdc()...');
            try {
                const collection = this.db.collection(this.collectionNameCryptoArtifacts);
                const result = yield collection.findOne({ idc: idc });
                console.log(`[${(0, timestamp_1.getFormattedTimestamp)()}]`, 'getSharedSecretFromIdc()->Shared secret from IDC: <', result ? result.shared_secret : null, ">");
                if (!(result === null || result === void 0 ? void 0 : result.shared_secret))
                    return null;
                const undecodedSharedSecret = Buffer.from(result.shared_secret, 'base64');
                console.log(`[${(0, timestamp_1.getFormattedTimestamp)()}]`, 'getSharedSecretFromIdc()->Undecoded shared secret: <', undecodedSharedSecret, ">");
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
            console.log(`[${(0, timestamp_1.getFormattedTimestamp)()}]`, 'getCatalogoEstadosUsuario()...');
            try {
                const collection = this.db.collection(this.collectionNameCatalogoEstadosUsuario);
                const result = yield collection.find({}).toArray();
                console.log(`[${(0, timestamp_1.getFormattedTimestamp)()}]`, 'getCatalogoEstadosUsuario()->Catalogo estados usuario: ', result);
                return result.map((iter) => iter.nombre_estado);
            }
            catch (error) {
                console.error(`[${(0, timestamp_1.getFormattedTimestamp)()}] Error fetching catalogo estados usuario:`, error);
                console.log(`[${(0, timestamp_1.getFormattedTimestamp)()}]`, '...getCatalogoEstadosUsuario() error');
                return [];
            }
            console.log(`[${(0, timestamp_1.getFormattedTimestamp)()}]`, '...getCatalogoEstadosUsuario() success');
        });
    }
    getCatalogoTiposUsuario() {
        return __awaiter(this, void 0, void 0, function* () {
            console.log(`[${(0, timestamp_1.getFormattedTimestamp)()}]`, 'getCatalogoTiposUsuario()...');
            try {
                const collection = this.db.collection(this.collectionNameCatalogoTiposUsuario);
                const result = yield collection.find({}).toArray();
                console.log(`[${(0, timestamp_1.getFormattedTimestamp)()}]`, 'getCatalogoTiposUsuario()->Catalogo tipos usuario: ', result);
                return result.map((iter) => iter.nombre_tipo);
            }
            catch (error) {
                console.error(`[${(0, timestamp_1.getFormattedTimestamp)()}] Error fetching catalogo tipos usuario:`, error);
                console.log(`[${(0, timestamp_1.getFormattedTimestamp)()}]`, '...getCatalogoTiposUsuario() error');
                return [];
            }
            console.log(`[${(0, timestamp_1.getFormattedTimestamp)()}]`, '...getCatalogoTiposUsuario() success');
        });
    }
    registerCryptoAssets(idcP, publicKey, sharedSecretEncoded) {
        return __awaiter(this, void 0, void 0, function* () {
            console.log(`[${(0, timestamp_1.getFormattedTimestamp)()}]`, 'registerCryptoAssets()...');
            try {
                const collection = this.db.collection(this.collectionNameCryptoArtifacts);
                yield collection.insertOne({ idc: idcP, public_key: publicKey, shared_secret: sharedSecretEncoded });
            }
            catch (error) {
                console.error(`[${(0, timestamp_1.getFormattedTimestamp)()}] Error registering crypto assets:`, error);
                console.log(`[${(0, timestamp_1.getFormattedTimestamp)()}]`, '...registerCryptoAssets() error');
                return false;
            }
            console.log(`[${(0, timestamp_1.getFormattedTimestamp)()}]`, '...registerCryptoAssets() success');
            return true;
        });
    }
    registerUsuario(usuario) {
        return __awaiter(this, void 0, void 0, function* () {
            console.log(`[${(0, timestamp_1.getFormattedTimestamp)()}]`, 'registerUsuario()...');
            try {
                const collection = this.db.collection(this.collectionNameUsuario);
                yield collection.insertOne(usuario);
            }
            catch (error) {
                console.error(`[${(0, timestamp_1.getFormattedTimestamp)()}] Error saving user in MongoDB:`, error);
                console.log(`[${(0, timestamp_1.getFormattedTimestamp)()}]`, '...registerUsuario() error');
                return false;
            }
            console.log(`[${(0, timestamp_1.getFormattedTimestamp)()}]`, '...registerUsuario() success');
            return true;
        });
    }
    //TODO: add a function to save the user info gotten from metaInfo encrypted with the shared secret
    saveUserInfo(idcP, info) {
        return __awaiter(this, void 0, void 0, function* () {
            console.log(`[${(0, timestamp_1.getFormattedTimestamp)()}]`, 'saveUserInfo()...');
            try {
                const collection = this.db.collection(this.collectionNameUsuario);
                yield collection.updateOne({ idc: idcP }, { $set: { info: info } });
            }
            catch (error) {
                console.error(`[${(0, timestamp_1.getFormattedTimestamp)()}] Error saving user info in MongoDB:`, error);
                console.log(`[${(0, timestamp_1.getFormattedTimestamp)()}]`, '...saveUserInfo() error');
            }
            console.log(`[${(0, timestamp_1.getFormattedTimestamp)()}]`, '...saveUserInfo() success');
        });
    }
}
exports.DBService = DBService;
