import { MongoClient } from 'mongodb';
import { Usuario } from '../TradinCore/Usuario';

async function isUserAliasRegistered(alias: string): Promise<boolean> {
  const uri = process.env.MONGODB_URI;

  if (!uri) throw new Error('MongoDB URI not found in environment variables');
  
  const client = new MongoClient(uri);

  try {
    await client.connect();
    const database = client.db('lepago-trading-core');
    const collection = database.collection('Usuario');
    const result = await collection.findOne({ alias: { $regex: /(angelahack1)/ } });
    return result !== null;
  } catch (error) {
    console.error('Error fetching users from MongoDB:', error);
    return false;
  } finally {
    await client.close();
  } 
}

export const isThereThisUserAlias = async (alias: string) => {
  const dbIsThere = await isUserAliasRegistered(alias);
  return dbIsThere;
};



/*
async function getUsersFromDB(): Promise<Usuario[]> {
  const uri = process.env.MONGODB_URI;

  if (!uri) throw new Error('MongoDB URI not found in environment variables');

  const client = new MongoClient(uri);

  try {
    await client.connect();
    const database = client.db('lepago-trading-core');
    const collection = database.collection('Usuario');

    const pipeline = [
      {
        $lookup: {
          from: 'CatalogoEstadosProducto',
          let: { estado: '$estado' },
          pipeline: [{ $match: { $expr: { $eq: ["$_id", "$$estado"] } } }],
          as: 'estado_producto'
        }
      },
      {
        $lookup: {
          from: 'CatalogoTiposDivisa',
          let: { divisa: '$divisa' },
          pipeline: [{ $match: { $expr: { $eq: ["$_id", "$$divisa"] } } }],
          as: 'tipo_divisa'
        }
      },
      {
        $project: {
          _id: 0,
          id: '$_id',
          qr: 1,
          nombre: 1,
          descripcion: 1,
          sku: 1,
          precio_inicial: 1,
          image_url: 1,
          estado: "$estado_producto.nombre_estado",
          divisa: "$tipo_divisa.nombre_tipo"
        }
      }
    ];

    const aggregationResult = await collection.aggregate(pipeline).toArray();
    
    return aggregationResult.map(product => ({
      id: product.id.toString(), 
      name: product.nombre,
      description: product.descripcion,
      price: product.precio_inicial,
      divisa: product.divisa?.[0] || '', 
      image_url: product.image_url,
      estado: product.estado?.[0] || 'N/A', 
    }));

  } catch (error) {
    console.error('Error fetching products from MongoDB:', error);
    return []; 
  } finally {
    await client.close();
  }
}

export const initializeProducts = async () => {
  const dbProducts = await getProductsFromDB();
  products.length = 0; 
  products.push(...dbProducts);
};
*/