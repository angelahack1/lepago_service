import { MongoClient } from 'mongodb';


async function isUserAliasRegistered(aliasP: string): Promise<boolean> {
  const uri = process.env.MONGODB_URI;

  if (!uri) throw new Error('XXXXXXXX MongoDB URI not found in environment variables');
  
  const client = new MongoClient(uri);

  try {
    await client.connect();
    const database = client.db('lepago-trading-core');
    const collection = database.collection('Usuario');
    const result = await collection.findOne({ alias: aliasP });
    if(result === null) {
      console.log(`[${new Date().toISOString()}]`,"alias not found: ",aliasP);
      return false;
    } else {
      console.log(`[${new Date().toISOString()}]`,"alias found: ",aliasP);
      return true;
    }
  } catch (error) {
    console.error('Error fetching users from MongoDB:', error);
    return true;
  } finally {
    await client.close();
  } 
}

export const isThereThisUserAlias = async (alias: string) => {
  const dbIsThere = await isUserAliasRegistered(alias);
  return dbIsThere;
};
