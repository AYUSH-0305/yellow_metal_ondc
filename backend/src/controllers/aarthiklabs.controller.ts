import { Request, Response } from 'express';
import prisma from '../utils/db';
import { broadcastRequestSchema, leadPushRequestSchema } from '../schemas/aarthiklabs.schema';
import { computeOffer } from '../services/offer.service';
import { assignOfficer } from '../utils/officers';
import { LeadService } from '../services/lead.service';

export const handleBroadcast = async (req: Request, res: Response) => {
  try {
    const parsed = broadcastRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'validation_failed', details: parsed.error.errors });
      return;
    }

    const { mobile_number, gold_weight_grams } = parsed.data;

    const existingLead = await prisma.lead.findFirst({ where: { mobile_number } });
    if (existingLead) {
      res.status(200).json({
        is_duplicate: true,
        existing_lead_id: existingLead.id,
        existing_status: existingLead.status
      });
      return;
    }

    const offer = await computeOffer(gold_weight_grams);
    const officer = assignOfficer();

    res.status(200).json({
      is_duplicate: false,
      provisional_offer: offer,
      branch_officer: officer
    });
    return;
  } catch (error) {
    console.error("Broadcast Error:", error);
    res.status(500).json({ error: 'internal_server_error' });
    return;
  }
};

export const handleLeadPush = async (req: Request, res: Response) => {
  try {
    // 1. Validate incoming JSON payload
    const parsed = leadPushRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'validation_failed', details: parsed.error.errors });
      return;
    }

    // 2. Delegate to business logic service
    const result = await LeadService.createLead(parsed.data);

    // 3. Return 201 Created (or 200 OK if it was an idempotent retry)
    res.status(result.isNew ? 201 : 200).json({
      lead_id: result.lead.id,
      status: "received",
      acknowledged_at: new Date().toISOString()
    });
    return;
  } catch (error) {
    console.error("Lead Push Error:", error);
    res.status(500).json({ error: 'internal_server_error' });
    return;
  }
};
