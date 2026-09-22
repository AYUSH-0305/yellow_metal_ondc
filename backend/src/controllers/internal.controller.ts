import { Request, Response } from 'express';
import prisma from '../utils/db';
import { WebhookService } from '../services/webhook.service';
import { GoldRateService } from '../services/goldRate.service';

export const updateLeadStatus = async (req: Request, res: Response) => {
  try {
    const { status, loan_id, disbursement_amount, disbursement_date, tenure } = req.body;
    
    const lead = await prisma.lead.findUnique({ where: { id: req.params.id } });
    if (!lead) {
      res.status(404).json({ error: 'not_found' });
      return;
    }

    const updatedLead = await prisma.lead.update({
      where: { id: req.params.id },
      data: {
        status,
        loan_id: loan_id || lead.loan_id,
        disbursement_amount: disbursement_amount || lead.disbursement_amount,
        disbursement_date: disbursement_date || lead.disbursement_date,
        tenure: tenure || lead.tenure,
      }
    });

    WebhookService.dispatch(updatedLead.id, status).catch(console.error);

    res.status(200).json({ data: updatedLead });
    return;
  } catch (error) {
    console.error('Update Status Error:', error);
    res.status(500).json({ error: 'internal_server_error' });
    return;
  }
};

export const getLeads = async (req: Request, res: Response) => {
   const leads = await prisma.lead.findMany({
     orderBy: { created_at: 'desc' }
   });
   res.json({ data: leads });
   return;
};

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

    // 💰 Dynamically calculate the max loan amount using the Live Gold API
    const maxEligibleLoan = await GoldRateService.calculateMaxLoanAmount(lead.gold_weight_grams);

    res.status(200).json({ 
      data: {
        ...lead,
        dashboard_insights: {
          current_22k_spot_rate_used: true,
          max_eligible_loan_amount_75_ltv: maxEligibleLoan
        }
      } 
    });
  } catch (error) {
    console.error('Get Lead Error:', error);
    res.status(500).json({ error: 'internal_server_error' });
  }
};
