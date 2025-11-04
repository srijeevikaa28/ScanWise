
import { z } from 'zod';

// This schema is flexible to parse data from Firestore which might have old field names,
// but it transforms it into a consistent shape with `productName` and `expiryDate`.
export const ProductSchema = z.object({
  id: z.string().optional(),
  qrId: z.string().nullable(),
  productName: z.string(),
  expiryDate: z.string(),
  ingredient: z.string().nullable(),
  note: z.string().nullable(),
  manufacture_date: z.string().nullable(),
  status: z.union([z.literal('in use'), z.literal('used'), z.literal('expired'), z.string()]),
  quantity: z.number(),
  userId: z.string().optional(),
});


export type Product = z.infer<typeof ProductSchema>;

export type ScannedData = {
  qrId?: string;
  productName?: string;
  expiryDate?: string;
  ingredients?: string;
  notes?: string;
  manufacturingDate?: string;
  manufactureDate?: string;
};

    
