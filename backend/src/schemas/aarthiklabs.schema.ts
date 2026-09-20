import { z } from 'zod';

export const broadcastRequestSchema = z.object({
  mobile_number: z.string().regex(/^[0-9]{10}$/, "Mobile number must be exactly 10 digits"),
  gold_weight_grams: z.number().positive("Gold weight must be greater than 0"),
});

// Schema for the Lead Push API
export const leadPushRequestSchema = z.object({
  distributor_ref_id: z.string().min(1, "Distributor Reference ID is required"),
  borrower: z.object({
    name: z.string().min(1, "Borrower name is required"),
    mobile_number: z.string().regex(/^[0-9]{10}$/, "Mobile number must be exactly 10 digits"),
    address: z.string().optional(),
    pincode: z.string().length(6, "Pincode must be 6 digits").optional(),
    dob: z.string().optional(), // Expected as YYYY-MM-DD
  }),
  gold_weight_grams: z.number().positive("Gold weight must be greater than 0"),
  offer_accepted: z.object({
    interest_rate_pct: z.number().positive(),
    tenure_months: z.number().int().positive(),
    ltv_pct: z.number().positive(),
  }),
});
