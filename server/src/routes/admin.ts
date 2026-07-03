import { Router } from 'express';
import { authenticateToken, requireAdmin } from '../middleware/auth';
import { listAllCaseChats, getAnyCaseMessages } from '../controllers/admin';

const router = Router();

router.use(authenticateToken, requireAdmin);

router.get('/cases', listAllCaseChats);
router.get('/cases/:caseId/messages', getAnyCaseMessages);

export default router;
