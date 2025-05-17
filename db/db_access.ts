import { MongoClient, Db, Collection } from 'mongodb';
import { getFormattedTimestamp } from '../timestamp/timestamp';
import { Usuario } from '../TradinCore/Usuario';
import { CatalogoEstadosUsuario } from '../TradinCore/CatalogoEstadosUsuario';
import { CatalogoTiposUsuario } from '../TradinCore/CatalogoTiposUsuario';

export class UserDbService {
  private uri: string;
  private client: MongoClient;
  private dbName: string = 'lepago-trading-core';
  private collectionName: string = 'Usuario';
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

  public async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.close();
    }
    console.log(`[${getFormattedTimestamp()}] MongoDB connection closed or ensured closed.`); // Optional log
  }

  public async isAliasRegistered(alias: string): Promise<boolean> {
    try {
      const collection: Collection<Usuario> = this.db.collection(this.collectionName);
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

  private async getCatalogoEstadosUsuario(): Promise<Array<string>> {
    try {
      const collection: Collection<CatalogoEstadosUsuario> = this.db.collection(this.collectionName);
      const result = await collection.find({}).toArray();
      return result.map((iter) => iter.nombre_estado);
    } catch (error) {
      console.error(`[${getFormattedTimestamp()}] Error fetching catalogo estados usuario:`, error);
      return [];
    }
  }

  private async getCatalogoTiposUsuario(): Promise<Array<string>> {
    try {
      const collection: Collection<CatalogoTiposUsuario> = this.db.collection(this.collectionName);
      const result = await collection.find({}).toArray();
      return result.map((iter) => iter.nombre_tipo);
    } catch (error) {
      console.error(`[${getFormattedTimestamp()}] Error fetching catalogo tipos usuario:`, error);
      return [];
    }
  }


  public async registerUser(usuario: Usuario): Promise<void> {
    try {
      const catalogo_estados_usuario = await this.getCatalogoEstadosUsuario();
      const catalogo_tipos_usuario = await this.getCatalogoTiposUsuario();

      if (catalogo_estados_usuario.length === 0 || catalogo_tipos_usuario.length === 0) {
        throw new Error('Catalogo estados usuario o tipos usuario no encontrado');
      }

      const collection: Collection<Usuario> = this.db.collection(this.collectionName);
      await collection.insertOne(usuario);
    } catch (error) {
      console.error(`[${getFormattedTimestamp()}] Error registering user in MongoDB:`, error);
    }
  }
}