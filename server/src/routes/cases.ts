import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import {
  registerCase,
  getCases,
  getCaseMessages,
  markCaseRead,
} from '../controllers/cases';

const router = Router();

router.use(authenticateToken);

router.post('/', registerCase);
router.get('/', getCases);
router.get('/:caseId/messages', getCaseMessages);
router.put('/:caseId/read', markCaseRead);

export default router;
