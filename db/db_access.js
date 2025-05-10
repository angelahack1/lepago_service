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
exports.isThereThisUserAlias = void 0;
const mongodb_1 = require("mongodb");
function isUserAliasRegistered(aliasP) {
    return __awaiter(this, void 0, void 0, function* () {
        const uri = process.env.MONGODB_URI;
        if (!uri)
            throw new Error('XXXXXXXX MongoDB URI not found in environment variables');
        const client = new mongodb_1.MongoClient(uri);
        try {
            yield client.connect();
            const database = client.db('lepago-trading-core');
            const collection = database.collection('Usuario');
            const result = yield collection.findOne({ alias: aliasP });
            if (result === null) {
                console.log(`[${new Date().toISOString()}]`, "alias not found: ", aliasP);
                return false;
            }
            else {
                console.log(`[${new Date().toISOString()}]`, "alias found: ", aliasP);
                return true;
            }
        }
        catch (error) {
            console.error('Error fetching users from MongoDB:', error);
            return true;
        }
        finally {
            yield client.close();
        }
    });
}
const isThereThisUserAlias = (alias) => __awaiter(void 0, void 0, void 0, function* () {
    const dbIsThere = yield isUserAliasRegistered(alias);
    return dbIsThere;
});
exports.isThereThisUserAlias = isThereThisUserAlias;
