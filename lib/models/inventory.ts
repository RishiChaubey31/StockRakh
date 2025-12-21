import { getDb } from '@/lib/db/mongodb';

// Use any for ObjectId type to avoid static import issues with Turbopack
export interface InventoryItem {
  _id?: any;
  partName: string;
  partNumber: string;
  code?: string;
  quantity: number;
  location: string;
  unitOfMeasure: string;
  partImages?: string[];
  brand?: string;
  description?: string;
  buyingPrice?: number;
  mrp?: number;
  supplier?: string;
  billingDate?: Date;
  billImages?: string[];
  createdAt?: Date;
  updatedAt?: Date;
}

export async function ensureIndexes() {
  const db = await getDb();
  const collection = db.collection<InventoryItem>('inventory');
  
  // Create indexes for fast searches
  await collection.createIndex({ partName: 1 });
  await collection.createIndex({ partNumber: 1 });
  await collection.createIndex({ code: 1 });
  await collection.createIndex({ brand: 1 });
  await collection.createIndex({ supplier: 1 });
  await collection.createIndex({ location: 1 });
  await collection.createIndex({ description: 'text' });
  
  // Compound index for global search
  await collection.createIndex({
    partName: 'text',
    partNumber: 'text',
    brand: 'text',
    supplier: 'text',
    location: 'text',
    description: 'text'
  });
}

export async function getInventoryCollection() {
  const db = await getDb();
  return db.collection<InventoryItem>('inventory');
}

