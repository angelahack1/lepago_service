import { MongoClient, Db, Collection } from 'mongodb';
import { getFormattedTimestamp } from '../timestamp/timestamp';
import { Usuario } from '../TradinCore/Usuario';
import { CatalogoEstadosUsuario } from '../TradinCore/CatalogoEstadosUsuario';
import { CatalogoTiposUsuario } from '../TradinCore/CatalogoTiposUsuario';
import { CryptoArtifacts } from '../TradinCore/CryptoArtifacts';

export class DBService {
  private uri: string;
  private client: MongoClient;
  private dbName: string = 'lepago-trading-core';
  private collectionNameUsuario: string = 'Usuario';
  private collectionNameCatalogoEstadosUsuario: string = 'CatalogoEstadosUsuario';
  private collectionNameCatalogoTiposUsuario: string = 'CatalogoTiposUsuario';
  private collectionNameCryptoArtifacts: string = 'CryptoArtifacts';
  private db!: Db;

  constructor(mongoUri?: string) {
    this.uri = mongoUri || process.env.MONGODB_URI || '';
    if (!this.uri) {
      throw new Error('MongoDB URI not found. Please provide it in constructor or set MONGODB_URI environment variable.');
    }
    this.client = new MongoClient(this.uri);
  }

  public async connect(): Promise<Db | null> {
    if (this.client) {
      await this.client.connect();
      this.db = this.client.db(this.dbName);
      return this.db;
    } else {
      return null;
    }
  }

  public async close(): Promise<void> {
    if (this.client) {
      await this.client.close();
    } else {
      console.error(`[${getFormattedTimestamp()}] Error closing MongoDB client.`);
    }
  }

  public async isAliasRegistered(alias: string): Promise<boolean> {
    try {
      const collection: Collection<Usuario> = this.db.collection(this.collectionNameUsuario);
      const result = await collection.findOne({ alias: alias });

      if (result === null) {
        console.log(`[${getFormattedTimestamp()}] Alias not found: ${alias}`);
        return false;
      } else {
        console.log(`[${getFormattedTimestamp()}] Alias found: ${alias}`);
        return true;
      }
    } catch (error) {
      console.error(`[${getFormattedTimestamp()}] Error checking alias ${alias} in MongoDB:`, error);
      return false;
    }
  }

  public async getLoginNameFromIdc(idc: string): Promise<string | null> {
    try {
      const collection: Collection<Usuario> = this.db.collection(this.collectionNameUsuario);
      const result = await collection.findOne({ idc: idc });
      console.log("Alias from IDC: <", result ? result.alias : null, ">");
      return result ? result.alias : null;
    } catch (error) {
      console.error(`[${getFormattedTimestamp()}] Error getting login name from IDC ${idc}:`, error);
      return null;
    }
  }

  public async getSharedSecretFromIdc(idc: string) {
    try {
      const collection: Collection<CryptoArtifacts> = this.db.collection(this.collectionNameCryptoArtifacts);
      const result = await collection.findOne({ idc: idc });
      console.log("Shared secret from IDC: <", result ? result.shared_secret : null, ">");
      if (!result?.shared_secret) return null;
      const undecodedSharedSecret = Buffer.from(result.shared_secret, 'base64');
      return undecodedSharedSecret;
    } catch (error) {
      console.error(`[${getFormattedTimestamp()}] Error getting shared secret from IDC ${idc}:`, error);
      return null;
    }
  }

  private async getCatalogoEstadosUsuario(): Promise<Array<string>> {
    try {
      const collection: Collection<CatalogoEstadosUsuario> = this.db.collection(this.collectionNameCatalogoEstadosUsuario);
      const result = await collection.find({}).toArray();
      return result.map((iter: CatalogoEstadosUsuario) => iter.nombre_estado);
    } catch (error) {
      console.error(`[${getFormattedTimestamp()}] Error fetching catalogo estados usuario:`, error);
      return [];
    }
  }

  private async getCatalogoTiposUsuario(): Promise<Array<string>> {
    try {
      const collection: Collection<CatalogoTiposUsuario> = this.db.collection(this.collectionNameCatalogoTiposUsuario);
      const result = await collection.find({}).toArray();
      return result.map((iter: CatalogoTiposUsuario) => iter.nombre_tipo);
    } catch (error) {
      console.error(`[${getFormattedTimestamp()}] Error fetching catalogo tipos usuario:`, error);
      return [];
    }
  }

  public async registerCryptoAssets(idcP: string, publicKey: string, sharedSecret: string): Promise<boolean> {
    try {
      const collection: Collection<CryptoArtifacts> = this.db.collection(this.collectionNameCryptoArtifacts);
      await collection.insertOne({ idc: idcP, public_key: publicKey, shared_secret: sharedSecret });
    } catch (error) {
      console.error(`[${getFormattedTimestamp()}] Error registering crypto assets:`, error);
      return false;
    }
    return true;
  }

  public async registerUsuario(usuario: Usuario): Promise<boolean> {
    try {
      const collection: Collection<Usuario> = this.db.collection(this.collectionNameUsuario);
      await collection.insertOne(usuario);
    } catch (error) {
      console.error(`[${getFormattedTimestamp()}] Error saving user in MongoDB:`, error);
      return false;
    }
    return true;
  }

  //TODO: add a function to save the user info gotten from metaInfo encrypted with the shared secret
  public async saveUserInfo(idcP: string, info: string): Promise<void> {
    try {
      const collection: Collection<Usuario> = this.db.collection(this.collectionNameUsuario);
      await collection.updateOne({ idc: idcP }, { $set: { info: info } });
    } catch (error) {
      console.error(`[${getFormattedTimestamp()}] Error saving user info in MongoDB:`, error);
    }
  }
}