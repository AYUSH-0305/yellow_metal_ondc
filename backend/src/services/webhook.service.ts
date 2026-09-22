import prisma from '../utils/db';

const MAX_RETRIES = 5;
const RETRY_DELAYS_MS = [60000, 300000, 900000, 3600000, 10800000];

export class WebhookService {
  static async dispatch(leadId: string, newStatus: string) {
    const lead = await prisma.lead.findUnique({ where: { id: leadId } });
    if (!lead) throw new Error(`Lead not found`);

    // Map the payload to match the EXACT keys they expect in their Status API document
    const payload = {
      lead_id: lead.id,
      loan_id: lead.loan_id,
      status: newStatus,
      disbursement_amount: lead.disbursement_amount,
      disbursement_date: lead.disbursement_date,
      product_type: lead.product_type,
      tenure: lead.tenure,
      tenure_unit: lead.tenure_unit,
      timestamp: new Date().toISOString()
    };

    const event = await prisma.webhookEvent.create({
      data: {
        lead_id: leadId,
        status_sent: newStatus,
        payload: JSON.stringify(payload),
        delivery_status: 'pending',
        attempts: 0,
      },
    });

    await this.attemptDelivery(event.id);
  }

  static async attemptDelivery(eventId: string) {
    const event = await prisma.webhookEvent.findUnique({ where: { id: eventId } });
    if (!event || event.delivery_status === 'delivered') return;

    const webhookUrl = process.env.AARTHIKLABS_WEBHOOK_URL;
    if (!webhookUrl) return;

    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-webhook-secret': process.env.WEBHOOK_SECRET || '',
        },
        body: event.payload,
        signal: AbortSignal.timeout(10000),
      });

      if (response.ok) {
        await prisma.webhookEvent.update({
          where: { id: eventId },
          data: {
            delivery_status: 'delivered',
            response_code: response.status,
            attempts: event.attempts + 1,
            last_attempt_at: new Date(),
          },
        });
        console.log(`✅ Webhook delivered for lead ${event.lead_id}`);
      } else {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (error: any) {
      const attemptNumber = event.attempts + 1;
      const hasRetriesLeft = attemptNumber < MAX_RETRIES;

      await prisma.webhookEvent.update({
        where: { id: eventId },
        data: {
          delivery_status: hasRetriesLeft ? 'pending' : 'failed',
          attempts: attemptNumber,
          last_attempt_at: new Date(),
          next_retry_at: hasRetriesLeft ? new Date(Date.now() + RETRY_DELAYS_MS[attemptNumber - 1]) : null,
          error_message: error.message,
        },
      });

      if (hasRetriesLeft) {
        setTimeout(() => this.attemptDelivery(eventId), RETRY_DELAYS_MS[attemptNumber - 1]);
      }
    }
  }
}
