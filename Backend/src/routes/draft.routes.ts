import { Router, Response } from 'express';
import {
  saveDraft,
  getMyDrafts,
  getDraftById,
  updateDraftSpecs,
  deleteDraft,
  publishDraft,
} from '../controllers/draft.controller';
import { authenticate, AuthRequest } from '../middleware/auth.middleware';

const router = Router();

router.get('/', authenticate, getMyDrafts);
router.post('/', authenticate, saveDraft);
router.get('/:id', authenticate, getDraftById);
router.put('/:id', authenticate, (req: AuthRequest, res: Response) => {
  req.body.draftId = req.params.id;
  return saveDraft(req, res);
});
router.put('/:id/specs', authenticate, updateDraftSpecs);
router.delete('/:id', authenticate, deleteDraft);
router.post('/:id/publish', authenticate, publishDraft);

export default router;
