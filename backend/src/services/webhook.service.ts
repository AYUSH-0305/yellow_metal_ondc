import prisma from '../utils/db';

const MAX_RETRIES = 5;

// Exponential backoff: 1 min, 5 min, 15 min, 60 min, 180 min
const RETRY_DELAYS_MS = [
  1 * 60 * 1000,
  5 * 60 * 1000,
  15 * 60 * 1000,
  60 * 60 * 1000,
  180 * 60 * 1000,
];

export class WebhookService {
  /**
   * Queues a webhook event and immediately attempts first delivery.
   * Called internally whenever a lead's status changes.
   */
  static async dispatch(leadId: string, newStatus: string) {
    // 1. Fetch the full lead to build the outbound payload
    const lead = await prisma.lead.findUnique({ where: { id: leadId } });
    if (!lead) throw new Error(`Lead ${leadId} not found`);

    const payload = {
      lead_id: lead.id,
      status: newStatus,
      status_reason: lead.rejection_reason || null,
      disbursement_details: lead.disbursement_details || null,
      officer_name: lead.branch_officer_name || null,
      officer_contact: lead.branch_officer_phone || null,
      updated_at: new Date().toISOString(),
    };

    // 2. Create the webhook event record (audit trail)
    const event = await prisma.webhookEvent.create({
      data: {
        lead_id: leadId,
        status_sent: newStatus,
        payload: JSON.stringify(payload),
        delivery_status: 'pending',
        attempts: 0,
      },
    });

    // 3. Attempt immediate delivery
    await this.attemptDelivery(event.id);
  }

  /**
   * Attempts to deliver a webhook event to AarthikLabs.
   * On failure, schedules a retry with exponential backoff.
   */
  static async attemptDelivery(eventId: string) {
    const event = await prisma.webhookEvent.findUnique({ where: { id: eventId } });
    if (!event || event.delivery_status === 'delivered') return;

    const webhookUrl = process.env.AARTHIKLABS_WEBHOOK_URL;
    if (!webhookUrl) {
      console.error('❌ AARTHIKLABS_WEBHOOK_URL is not configured in .env');
      await prisma.webhookEvent.update({
        where: { id: eventId },
        data: {
          delivery_status: 'failed',
          error_message: 'Webhook URL not configured',
          last_attempt_at: new Date(),
        },
      });
      return;
    }

    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-webhook-secret': process.env.WEBHOOK_SECRET || '',
        },
        body: event.payload,
        signal: AbortSignal.timeout(10000), // 10 second timeout
      });

      if (response.ok) {
        // ✅ Success
        await prisma.webhookEvent.update({
          where: { id: eventId },
          data: {
            delivery_status: 'delivered',
            response_code: response.status,
            attempts: event.attempts + 1,
            last_attempt_at: new Date(),
            error_message: null,
          },
        });
        console.log(`✅ Webhook delivered for lead ${event.lead_id} | Status: ${event.status_sent}`);
      } else {
        // ❌ AarthikLabs returned an error (4xx/5xx)
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error: any) {
      const attemptNumber = event.attempts + 1;
      const hasRetriesLeft = attemptNumber < MAX_RETRIES;

      const nextRetry = hasRetriesLeft
        ? new Date(Date.now() + RETRY_DELAYS_MS[attemptNumber - 1])
        : null;

      await prisma.webhookEvent.update({
        where: { id: eventId },
        data: {
          delivery_status: hasRetriesLeft ? 'pending' : 'failed',
          attempts: attemptNumber,
          last_attempt_at: new Date(),
          next_retry_at: nextRetry,
          error_message: error.message,
        },
      });

      if (hasRetriesLeft) {
        console.warn(`⚠️ Webhook attempt ${attemptNumber}/${MAX_RETRIES} failed for lead ${event.lead_id}. Retrying at ${nextRetry?.toISOString()}`);
        // Schedule retry (in production, use a proper job queue like BullMQ or QStash)
        setTimeout(() => this.attemptDelivery(eventId), RETRY_DELAYS_MS[attemptNumber - 1]);
      } else {
        console.error(`❌ Webhook permanently failed for lead ${event.lead_id} after ${MAX_RETRIES} attempts.`);
      }
    }
  }

  /**
   * Retries all pending webhooks that are past their next_retry_at time.
   * This is a recovery mechanism in case the server was restarted mid-retry.
   */
  static async retryPendingWebhooks() {
    const pending = await prisma.webhookEvent.findMany({
      where: {
        delivery_status: 'pending',
        next_retry_at: { lte: new Date() },
      },
    });

    console.log(`🔄 Found ${pending.length} pending webhook(s) to retry.`);
    for (const event of pending) {
      await this.attemptDelivery(event.id);
    }
  }
}

