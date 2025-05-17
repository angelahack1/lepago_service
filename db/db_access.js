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
exports.UserDbService = void 0;
const mongodb_1 = require("mongodb");
const timestamp_1 = require("../timestamp/timestamp");
class UserDbService {
    constructor(mongoUri) {
        this.dbName = 'lepago-trading-core';
        this.collectionName = 'Usuario';
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
    disconnect() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.client) {
                yield this.client.close();
            }
            console.log(`[${(0, timestamp_1.getFormattedTimestamp)()}] MongoDB connection closed or ensured closed.`); // Optional log
        });
    }
    isAliasRegistered(alias) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const collection = this.db.collection(this.collectionName);
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
    getCatalogoEstadosUsuario() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const collection = this.db.collection(this.collectionName);
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
                const collection = this.db.collection(this.collectionName);
                const result = yield collection.find({}).toArray();
                return result.map((iter) => iter.nombre_tipo);
            }
            catch (error) {
                console.error(`[${(0, timestamp_1.getFormattedTimestamp)()}] Error fetching catalogo tipos usuario:`, error);
                return [];
            }
        });
    }
    registerUser(usuario) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const catalogo_estados_usuario = yield this.getCatalogoEstadosUsuario();
                const catalogo_tipos_usuario = yield this.getCatalogoTiposUsuario();
                if (catalogo_estados_usuario.length === 0 || catalogo_tipos_usuario.length === 0) {
                    throw new Error('Catalogo estados usuario o tipos usuario no encontrado');
                }
                const collection = this.db.collection(this.collectionName);
                yield collection.insertOne(usuario);
            }
            catch (error) {
                console.error(`[${(0, timestamp_1.getFormattedTimestamp)()}] Error registering user in MongoDB:`, error);
            }
        });
    }
}
exports.UserDbService = UserDbService;
