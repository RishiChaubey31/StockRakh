import { ensureIndexes } from '@/lib/models/inventory';

export async function initializeDatabase() {
  try {
    await ensureIndexes();
    console.log('Database indexes initialized');
  } catch (error) {
    console.error('Error initializing database:', error);
  }
}

