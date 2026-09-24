import { Router } from 'express';
import { getLeads, getLeadById, updateLeadStatus } from '../controllers/internal.controller';
import { requireInternalApiKey } from '../middlewares/auth.middleware';

const router = Router();

// Dashboard-facing endpoints. Gated by a shared INTERNAL_API_KEY for now —
// a stopgap, not real per-user access control (see auth.middleware.ts).
router.use(requireInternalApiKey);

router.get('/leads', getLeads);
router.get('/leads/:id', getLeadById);
router.patch('/leads/:id/status', updateLeadStatus);

export default router;

