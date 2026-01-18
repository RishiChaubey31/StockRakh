import { z } from 'zod';

export const inventoryItemSchema = z.object({
  partName: z.string().min(1, 'Part name is required'),
  partNumber: z.string().min(1, 'Part number is required'),
  code: z.string().regex(/^[A-Z]*$/, 'Code must contain only uppercase letters').optional().or(z.literal('')),
  quantity: z.number().min(0, 'Quantity must be non-negative'),
  location: z.string().min(1, 'Location is required'),
  unitOfMeasure: z.string().min(1, 'Unit of measure is required'),
  partImages: z.array(z.string().url()).optional(),
  brand: z.string().optional(),
  description: z.string().optional(),
  buyingPrice: z.number().min(0).optional(),
  mrp: z.number().min(0).optional(),
  supplier: z.string().optional(),
  billingDate: z.string().nullish(),
  billImages: z.array(z.string().url()).optional(),
});

export type InventoryItemInput = z.infer<typeof inventoryItemSchema>;

