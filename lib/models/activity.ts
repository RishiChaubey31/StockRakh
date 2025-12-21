import { getDb } from '@/lib/db/mongodb';

export type ActivityType = 'add' | 'edit' | 'delete' | 'quantity_change';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface Activity {
  _id?: any;
  type: ActivityType;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  partId?: any | string;
  partName: string;
  partNumber: string;
  details?: string;
  createdAt: Date;
}

export async function getActivityCollection() {
  const db = await getDb();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return db.collection<Activity>('activities');
}

export async function createActivity(
  type: ActivityType,
  partName: string,
  partNumber: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  partId?: any | string,
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
