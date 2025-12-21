import { MongoClient, Db } from 'mongodb';

const options = {};

let client: MongoClient;
let clientPromise: Promise<MongoClient> | null = null;

function getClientPromise(): Promise<MongoClient> {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('Please add MONGODB_URI to your .env.local file');
  }

  // Use global variable in development to prevent multiple connections during HMR
  if (typeof global !== 'undefined' && process.env.NODE_ENV === 'development') {
    let globalWithMongo = global as typeof globalThis & {
      _mongoClientPromise?: Promise<MongoClient>;
    };

    if (!globalWithMongo._mongoClientPromise) {
      client = new MongoClient(uri, {
        ...options,
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
      });
      globalWithMongo._mongoClientPromise = client.connect().catch((err) => {
        // Clear the promise on error so it can be retried
        globalWithMongo._mongoClientPromise = undefined;
        throw err;
      });
    }
    return globalWithMongo._mongoClientPromise;
  } else {
    // In production mode, it's best to not use a global variable.
    if (!clientPromise) {
      client = new MongoClient(uri, {
        ...options,
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
      });
      clientPromise = client.connect().catch((err) => {
        clientPromise = null;
        throw err;
      });
    }
    return clientPromise;
  }
}

export async function getDb(): Promise<Db> {
  const client = await getClientPromise();
  return client.db('inventory');
}

export default getClientPromise;
