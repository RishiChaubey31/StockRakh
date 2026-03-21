import type { ObjectId } from 'mongodb';
import { getDb } from '@/lib/db/mongodb';

export type ActivityType = 'add' | 'edit' | 'delete' | 'quantity_change';

export interface Activity {
  _id?: ObjectId;
  type: ActivityType;
  partId?: ObjectId | string;
  partName: string;
  partNumber: string;
  details?: string;
  createdAt: Date;
}

export async function getActivityCollection() {
  const db = await getDb();
  return db.collection<Activity>('activities');
}

export async function createActivity(
  type: ActivityType,
  partName: string,
  partNumber: string,
  partId?: ObjectId | string,
  details?: string
) {
  const collection = await getActivityCollection();
  await collection.insertOne({
    type,
    partId,
    partName,
    partNumber,
    details,
    createdAt: new Date(),
  });
}
