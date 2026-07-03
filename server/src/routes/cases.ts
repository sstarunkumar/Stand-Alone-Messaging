import { Router } from 'express';
import { authenticateToken, requireAdmin } from '../middleware/auth';
import {
  registerCase,
  getCases,
  getCaseMessages,
  markCaseRead,
} from '../controllers/cases';

const router = Router();

router.use(authenticateToken);

// Provisioning is a backend-to-backend call (NOS creates the pairing when a case is
// assigned) — never a browser session — so it's gated the same way admin routes are.
router.post('/', requireAdmin, registerCase);
router.get('/', getCases);
router.get('/:caseId/messages', getCaseMessages);
router.put('/:caseId/read', markCaseRead);

export default router;
