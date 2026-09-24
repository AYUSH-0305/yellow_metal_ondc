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

// Internal (dashboard-facing) status update. Only LEAD_CREATED and
// DISBURSED are confirmed real values so far — the full status vocabulary
// (rejected/expired leads per Flow 4) isn't settled yet, so this validates
// shape (non-empty, UPPER_SNAKE_CASE) rather than a hardcoded enum that
// would need editing again once that's decided.
export const updateLeadStatusReq = z.object({
  status: z.string().min(1).regex(/^[A-Z][A-Z_]*$/, 'status must be UPPER_SNAKE_CASE'),
  loan_id: z.string().optional(),
  disbursement_amount: z.number().positive().optional(),
  disbursement_date: z.string().optional(),
  tenure: z.number().int().positive().optional(),
});
