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
function isUserAliasRegistered(alias) {
    return __awaiter(this, void 0, void 0, function* () {
        const uri = process.env.MONGODB_URI;
        if (!uri)
            throw new Error('MongoDB URI not found in environment variables');
        const client = new mongodb_1.MongoClient(uri);
        try {
            yield client.connect();
            const database = client.db('lepago-trading-core');
            const collection = database.collection('Usuario');
            const result = yield collection.findOne({ alias: { $regex: /(angelahack1)/ } });
            return result !== null;
        }
        catch (error) {
            console.error('Error fetching users from MongoDB:', error);
            return false;
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
