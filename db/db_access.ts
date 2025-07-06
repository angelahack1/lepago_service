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

  public async connect(): Promise<Db> {
    if (!this.client) {
      throw new Error('MongoDB client not initialized');
    }
    if (!this.db) {
      await this.client.connect();
      this.db = this.client.db(this.dbName);
    }
    return this.db;
  }

  public async close(): Promise<void> {
    if (this.client) {
      await this.client.close();
    }
  }

  public async isAliasRegistered(alias: string): Promise<boolean> {
    const collection: Collection<Usuario> = this.db.collection(this.collectionNameUsuario);
    const result = await collection.findOne({ alias: alias });
    return !!result;
  }

  public async getLoginNameFromIdc(idc: string): Promise<string | null> {
    const collection: Collection<Usuario> = this.db.collection(this.collectionNameUsuario);
    const result = await collection.findOne({ idc: idc });
    return result ? result.alias : null;
  }

  public async getSharedSecretFromIdc(idc: string): Promise<Buffer | null> {
    const collection: Collection<CryptoArtifacts> = this.db.collection(this.collectionNameCryptoArtifacts);
    const result = await collection.findOne({ idc: idc });
    if (!result?.shared_secret) {
      return null;
    }
    return Buffer.from(result.shared_secret, 'base64');
  }

  private async getCatalogoEstadosUsuario(): Promise<Array<string>> {
    const collection: Collection<CatalogoEstadosUsuario> = this.db.collection(this.collectionNameCatalogoEstadosUsuario);
    const result = await collection.find({}).toArray();
    return result.map((iter: CatalogoEstadosUsuario) => iter.nombre_estado);
  }

  private async getCatalogoTiposUsuario(): Promise<Array<string>> {
    const collection: Collection<CatalogoTiposUsuario> = this.db.collection(this.collectionNameCatalogoTiposUsuario);
    const result = await collection.find({}).toArray();
    return result.map((iter: CatalogoTiposUsuario) => iter.nombre_tipo);
  }

  public async registerCryptoAssets(idcP: string, publicKey: string, sharedSecretEncoded: string): Promise<void> {
    const collection: Collection<CryptoArtifacts> = this.db.collection(this.collectionNameCryptoArtifacts);
    await collection.insertOne({ idc: idcP, public_key: publicKey,  shared_secret: sharedSecretEncoded });
  }

  public async registerUsuario(usuario: Usuario): Promise<void> {
    const collection: Collection<Usuario> = this.db.collection(this.collectionNameUsuario);
    await collection.insertOne(usuario);
  }

  public async saveUserInfo(idcP: string, info: string): Promise<void> {
    const collection: Collection<Usuario> = this.db.collection(this.collectionNameUsuario);
    await collection.updateOne({ idc: idcP }, { $set: { info: info } });
  }
}