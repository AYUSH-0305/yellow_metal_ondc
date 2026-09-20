import { Router } from 'express';
import { handleBroadcast, handleLeadPush } from '../controllers/aarthiklabs.controller';
import { requireApiKey } from '../middlewares/auth.middleware';

const router = Router();

// Apply API Key security to all AarthikLabs external routes
router.use(requireApiKey);

// 1. Broadcast / Dedupe Engine Endpoint
router.post('/dedupe', handleBroadcast);

// 2. Lead Push Endpoint
router.post('/leads', handleLeadPush);

export default router;
