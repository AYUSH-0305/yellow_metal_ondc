import { Router } from 'express';
import { handleDedupe, handleLeadCreation, handleNearestBranch, handleLeadStatus } from '../controllers/aarthiklabs.controller';
import { requireApiKey } from '../middlewares/auth.middleware';

const router = Router();

router.use(requireApiKey);

router.post('/dedupe', handleDedupe);
router.post('/leads', handleLeadCreation);
router.post('/branch', handleNearestBranch);
router.post('/status', handleLeadStatus);

export default router;
