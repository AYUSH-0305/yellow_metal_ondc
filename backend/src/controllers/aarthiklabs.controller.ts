import { Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import prisma from '../utils/db';
import { dedupeReq, leadCreationReq, branchReq, statusReq } from '../schemas/aarthiklabs.schema';
import { generateId } from '../utils/ids';

// 1. Customer Dedupe API
export const handleDedupe = async (req: Request, res: Response) => {
  const parsed = dedupeReq.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error);

  const existingLead = await prisma.lead.findFirst({
    where: { mobile_number: parsed.data.mobile_number }
  });

  if (existingLead) {
    return res.json({
      is_existing_customer: true,
      customer_id: existingLead.customer_id || generateId('YMCUST')
    });
  }

  return res.json({ is_existing_customer: false, customer_id: null });
};

// 2. Lead Creation API
const MAX_ID_ATTEMPTS = 5;

export const handleLeadCreation = async (req: Request, res: Response) => {
  const parsed = leadCreationReq.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error);

  const customer_id = generateId('YMCUST');

  // id is the primary key and generateId() isn't guaranteed collision-free,
  // so retry with a fresh id on a unique-constraint violation (P2002)
  // rather than 500ing on the rare collision.
  for (let attempt = 1; attempt <= MAX_ID_ATTEMPTS; attempt++) {
    const lead_id = generateId('YMLEAD');
    try {
      await prisma.lead.create({
        data: {
          id: lead_id,
          customer_id: customer_id,
          mobile_number: parsed.data.mobile_number,
          name: parsed.data.name,
          pincode: parsed.data.pincode,
          address_line_1: parsed.data.address_line_1,
          address_line_2: parsed.data.address_line_2,
          gold_weight_grams: parsed.data.gold_weight_grams,
          pan: parsed.data.pan,
          date_of_birth: parsed.data.date_of_birth,
          gender: parsed.data.gender,
          offer_accepted_at: new Date(parsed.data.offer_accepted_at),
          status: "LEAD_CREATED"
        }
      });

      return res.json({
        lead_id: lead_id,
        loan_id: null,
        status: "LEAD_CREATED"
      });
    } catch (error) {
      const isIdCollision =
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002' &&
        (error.meta?.target as string[] | undefined)?.includes('id');
      if (!isIdCollision) throw error;
      // otherwise loop and try a new id
    }
  }

  return res.status(500).json({ error: 'internal_server_error', message: 'Could not generate a unique lead id' });
};

// 3. Nearest Branch API
export const handleNearestBranch = async (req: Request, res: Response) => {
  const parsed = branchReq.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error);

  return res.json({
    serviceable: true,
    branch_id: "YM-RJT-001",
    branch_name: "Yellow Metal Rajkot Kalawad Road",
    branch_address: "101 Kalawad Road, Rajkot, Gujarat " + parsed.data.pincode,
    contact_person_name: "Amit Patel",
    contact_person_mobile: "9876501234"
  });
};

// 4. Lead Status API
export const handleLeadStatus = async (req: Request, res: Response) => {
  const parsed = statusReq.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error);

  const lead = await prisma.lead.findUnique({
    where: { id: parsed.data.lead_id }
  });

  if (!lead) return res.status(404).json({ error: "Lead not found" });

  return res.json({
    lead_id: lead.id,
    loan_id: lead.loan_id,
    status: lead.status,
    disbursement_amount: lead.disbursement_amount,
    disbursement_date: lead.disbursement_date,
    product_type: lead.product_type,
    tenure: lead.tenure,
    tenure_unit: lead.tenure_unit
  });
};
