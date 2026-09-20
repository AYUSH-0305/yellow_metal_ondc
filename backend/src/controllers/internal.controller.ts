import { Request, Response } from 'express';
import prisma from '../utils/db';
import { WebhookService } from '../services/webhook.service';
import { z } from 'zod';

const updateStatusSchema = z.object({
  status: z.enum(['new', 'contacted', 'branch_visit_scheduled', 'disbursed', 'rejected']),
  rejection_reason: z.string().optional(),
  disbursement_details: z.string().optional(),
  branch_officer_name: z.string().optional(),
  branch_officer_phone: z.string().optional(),
});

/**
 * GET /api/internal/leads
 * Returns all leads for the admin dashboard (with optional filters).
 */
export const getLeads = async (req: Request, res: Response) => {
  try {
    const { status, pincode, page = '1', limit = '20' } = req.query;

    const where: any = {};
    if (status) where.status = status;
    if (pincode) where.pincode = pincode;

    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);

    const [leads, total] = await Promise.all([
      prisma.lead.findMany({
        where,
        orderBy: { created_at: 'desc' },
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
      }),
      prisma.lead.count({ where }),
    ]);

    res.status(200).json({
      data: leads,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        total_pages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    console.error('Get Leads Error:', error);
    res.status(500).json({ error: 'internal_server_error' });
  }
};

/**
 * GET /api/internal/leads/:id
 * Returns a single lead with its webhook history.
 */
export const getLeadById = async (req: Request, res: Response) => {
  try {
    const lead = await prisma.lead.findUnique({
      where: { id: req.params.id },
      include: { webhook_events: { orderBy: { created_at: 'desc' } } },
    });

    if (!lead) {
      res.status(404).json({ error: 'not_found', message: 'Lead not found' });
      return;
    }

    res.status(200).json({ data: lead });
  } catch (error) {
    console.error('Get Lead Error:', error);
    res.status(500).json({ error: 'internal_server_error' });
  }
};

/**
 * PATCH /api/internal/leads/:id/status
 * Updates a lead's status and fires the outbound webhook to AarthikLabs.
 * This is the critical trigger point connecting the Dashboard to the Webhook Dispatcher.
 */
export const updateLeadStatus = async (req: Request, res: Response) => {
  try {
    // 1. Validate the incoming status
    const parsed = updateStatusSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'validation_failed', details: parsed.error.errors });
      return;
    }

    const { status, rejection_reason, disbursement_details, branch_officer_name, branch_officer_phone } = parsed.data;

    // 2. Check lead exists
    const existingLead = await prisma.lead.findUnique({ where: { id: req.params.id } });
    if (!existingLead) {
      res.status(404).json({ error: 'not_found', message: 'Lead not found' });
      return;
    }

    // 3. Update the lead in the database
    const updatedLead = await prisma.lead.update({
      where: { id: req.params.id },
      data: {
        status,
        rejection_reason: status === 'rejected' ? rejection_reason : existingLead.rejection_reason,
        disbursement_details: status === 'disbursed' ? disbursement_details : existingLead.disbursement_details,
        branch_officer_name: branch_officer_name || existingLead.branch_officer_name,
        branch_officer_phone: branch_officer_phone || existingLead.branch_officer_phone,
      },
    });

    // 4. 🔥 Fire the outbound webhook to AarthikLabs (non-blocking)
    WebhookService.dispatch(updatedLead.id, status).catch((err) => {
      console.error('Webhook dispatch failed:', err);
    });

    // 5. Return immediately to the dashboard (don't wait for webhook delivery)
    res.status(200).json({
      data: updatedLead,
      message: `Status updated to '${status}'. Webhook dispatched to AarthikLabs.`,
    });
  } catch (error) {
    console.error('Update Status Error:', error);
    res.status(500).json({ error: 'internal_server_error' });
  }
};

