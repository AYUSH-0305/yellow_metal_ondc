import app from './app';
import dotenv from 'dotenv';
import { WebhookService } from './services/webhook.service';

dotenv.config();

const PORT = process.env.PORT || 8080;
const WEBHOOK_RETRY_SWEEP_MS = 60_000; // matches the shortest retry delay in webhook.service.ts

app.listen(PORT, () => {
  console.log(`🚀 YellowMetal Backend API is running on port ${PORT}`);
  setInterval(() => {
    WebhookService.retryPendingWebhooks().catch((err) =>
      console.error('Webhook retry sweep failed:', err)
    );
  }, WEBHOOK_RETRY_SWEEP_MS);
});

