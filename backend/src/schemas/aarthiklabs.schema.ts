import { z } from 'zod';

export const dedupeReq = z.object({
  mobile_number: z.string().min(10)
});

export const leadCreationReq = z.object({
  mobile_number: z.string(),
  name: z.string(),
  pincode: z.string(),
  address_line_1: z.string(),
  address_line_2: z.string().optional().nullable(),
  gold_weight_grams: z.number(),
  pan: z.string(),
  date_of_birth: z.string(),
  gender: z.string(),
  offer_accepted_at: z.string()
});

export const branchReq = z.object({
  pincode: z.string()
});

export const statusReq = z.object({
  lead_id: z.string()
});
