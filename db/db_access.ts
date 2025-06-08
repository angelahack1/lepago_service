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
    console.log(`[${getFormattedTimestamp()}]`,'connect()...');
    try {
      if (!this.client) {
        console.error(`[${getFormattedTimestamp()}] MongoDB client not initialized`);
        return null;
      }
      
      if (!this.db) {
        console.log(`[${getFormattedTimestamp()}]`,'connect()->Connecting to MongoDB...');
        await this.client.connect();
        console.log(`[${getFormattedTimestamp()}]`,'connect()->Connected to MongoDB');
        this.db = this.client.db(this.dbName);
        console.log(`[${getFormattedTimestamp()}]`,'connect()->Database selected: ', this.dbName);
      }
      
      return this.db;
    } catch (error) {
      console.error(`[${getFormattedTimestamp()}] Error connecting to MongoDB:`, error);
      return null;
    }
  }

  public async close(): Promise<void> {
    console.log(`[${getFormattedTimestamp()}]`,'close()...');
    try {
      if (this.client) {
        console.log(`[${getFormattedTimestamp()}]`,'close()->Closing MongoDB client...');
        await this.client.close();
        console.log(`[${getFormattedTimestamp()}]`,'close()->MongoDB client closed');
      } else {
      console.error(`[${getFormattedTimestamp()}] Error closing MongoDB client.`);
      }
    } catch (error) {
      console.error(`[${getFormattedTimestamp()}] Error closing MongoDB client:`, error);
    }
    console.log(`[${getFormattedTimestamp()}]`,'...close()');
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
    console.log(`[${getFormattedTimestamp()}]`,'getLoginNameFromIdc()...');
    try {
      const collection: Collection<Usuario> = this.db.collection(this.collectionNameUsuario);
      const result = await collection.findOne({ idc: idc });
      console.log(`[${getFormattedTimestamp()}]`,'getLoginNameFromIdc()->Alias from IDC: <', result ? result.alias : null, ">");
      return result ? result.alias : null;
    } catch (error) {
      console.error(`[${getFormattedTimestamp()}] Error getting login name from IDC ${idc}:`, error);
      console.log(`[${getFormattedTimestamp()}]`,'...getLoginNameFromIdc() error');
      return null;
    }
    console.log(`[${getFormattedTimestamp()}]`,'...getLoginNameFromIdc() success');
  }

  public async getSharedSecretFromIdc(idc: string) {
    console.log(`[${getFormattedTimestamp()}]`,'getSharedSecretFromIdc()...');
    try {
      const collection: Collection<CryptoArtifacts> = this.db.collection(this.collectionNameCryptoArtifacts);
      const result = await collection.findOne({ idc: idc });
      console.log(`[${getFormattedTimestamp()}]`,'getSharedSecretFromIdc()->Shared secret from IDC: <', result ? result.shared_secret : null, ">");
      if (!result?.shared_secret) return null;
      const undecodedSharedSecret = Buffer.from(result.shared_secret, 'base64');
      return undecodedSharedSecret;
    } catch (error) {
      console.error(`[${getFormattedTimestamp()}] Error getting shared secret from IDC ${idc}:`, error);
      console.log(`[${getFormattedTimestamp()}]`,'...getSharedSecretFromIdc() error');
      return null;
    }
    console.log(`[${getFormattedTimestamp()}]`,'...getSharedSecretFromIdc() success');
  }

  private async getCatalogoEstadosUsuario(): Promise<Array<string>> {
    console.log(`[${getFormattedTimestamp()}]`,'getCatalogoEstadosUsuario()...');
    try {
      const collection: Collection<CatalogoEstadosUsuario> = this.db.collection(this.collectionNameCatalogoEstadosUsuario);
      const result = await collection.find({}).toArray();
      console.log(`[${getFormattedTimestamp()}]`,'getCatalogoEstadosUsuario()->Catalogo estados usuario: ', result);
      return result.map((iter: CatalogoEstadosUsuario) => iter.nombre_estado);
    } catch (error) {
      console.error(`[${getFormattedTimestamp()}] Error fetching catalogo estados usuario:`, error);
      console.log(`[${getFormattedTimestamp()}]`,'...getCatalogoEstadosUsuario() error');
      return [];
    }
    console.log(`[${getFormattedTimestamp()}]`,'...getCatalogoEstadosUsuario() success');
  }

  private async getCatalogoTiposUsuario(): Promise<Array<string>> {
    console.log(`[${getFormattedTimestamp()}]`,'getCatalogoTiposUsuario()...');
    try {
      const collection: Collection<CatalogoTiposUsuario> = this.db.collection(this.collectionNameCatalogoTiposUsuario);
      const result = await collection.find({}).toArray();
      console.log(`[${getFormattedTimestamp()}]`,'getCatalogoTiposUsuario()->Catalogo tipos usuario: ', result);
      return result.map((iter: CatalogoTiposUsuario) => iter.nombre_tipo);
    } catch (error) {
      console.error(`[${getFormattedTimestamp()}] Error fetching catalogo tipos usuario:`, error);
      console.log(`[${getFormattedTimestamp()}]`,'...getCatalogoTiposUsuario() error');
      return [];
    }
    console.log(`[${getFormattedTimestamp()}]`,'...getCatalogoTiposUsuario() success');
  }

  public async registerCryptoAssets(idcP: string, publicKey: string, sharedSecret: string): Promise<boolean> {
    console.log(`[${getFormattedTimestamp()}]`,'registerCryptoAssets()...');
    try {
      const collection: Collection<CryptoArtifacts> = this.db.collection(this.collectionNameCryptoArtifacts);
      await collection.insertOne({ idc: idcP, public_key: publicKey, shared_secret: sharedSecret });
    } catch (error) {
      console.error(`[${getFormattedTimestamp()}] Error registering crypto assets:`, error);
      console.log(`[${getFormattedTimestamp()}]`,'...registerCryptoAssets() error');
      return false;
    }
    console.log(`[${getFormattedTimestamp()}]`,'...registerCryptoAssets() success');
    return true;
  }

  public async registerUsuario(usuario: Usuario): Promise<boolean> {
    console.log(`[${getFormattedTimestamp()}]`,'registerUsuario()...');
    try {
      const collection: Collection<Usuario> = this.db.collection(this.collectionNameUsuario);
      await collection.insertOne(usuario);
    } catch (error) {
      console.error(`[${getFormattedTimestamp()}] Error saving user in MongoDB:`, error);
      console.log(`[${getFormattedTimestamp()}]`,'...registerUsuario() error');
      return false;
    }
    console.log(`[${getFormattedTimestamp()}]`,'...registerUsuario() success');
    return true;
  }

  //TODO: add a function to save the user info gotten from metaInfo encrypted with the shared secret
  public async saveUserInfo(idcP: string, info: string): Promise<void> {
    console.log(`[${getFormattedTimestamp()}]`,'saveUserInfo()...');
    try {
      const collection: Collection<Usuario> = this.db.collection(this.collectionNameUsuario);
      await collection.updateOne({ idc: idcP }, { $set: { info: info } });
    } catch (error) {
      console.error(`[${getFormattedTimestamp()}] Error saving user info in MongoDB:`, error);
      console.log(`[${getFormattedTimestamp()}]`,'...saveUserInfo() error');
    }
    console.log(`[${getFormattedTimestamp()}]`,'...saveUserInfo() success');
  }
}