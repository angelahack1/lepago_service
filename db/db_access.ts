import { MongoClient, Db, Collection } from 'mongodb';
import { getFormattedTimestamp } from '../timestamp/timestamp';

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
      const collection: Collection = this.db.collection(this.collectionName);
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
}