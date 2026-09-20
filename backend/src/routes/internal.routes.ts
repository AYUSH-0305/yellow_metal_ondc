import { Router } from 'express';
import { getLeads, getLeadById, updateLeadStatus } from '../controllers/internal.controller';

const router = Router();

// Dashboard endpoints (will be protected by session auth when dashboard is built)
router.get('/leads', getLeads);
router.get('/leads/:id', getLeadById);
router.patch('/leads/:id/status', updateLeadStatus);

export default router;

