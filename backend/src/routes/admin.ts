import { Router, Request, Response } from 'express';
import { socialIngestionService } from '../services/socialIngestionService.js';
import { requireAdmin } from '../middleware/authRoleMiddleware.js';

const router = Router();

// Phase 29: Protect all admin endpoints with strict admin authorization
router.use(requireAdmin);

// GET /api/v1/admin/social-staging
router.get('/social-staging', (_req: Request, res: Response) => {
  const items = socialIngestionService.getStagedItems();
  return res.json({
    success: true,
    data: { staged_items: items }
  });
});

// POST /api/v1/admin/social-staging/:id/approve
router.post('/social-staging/:id/approve', (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const result = socialIngestionService.approveStagedItem(id);
    return res.json({
      success: true,
      data: {
        message: 'Successfully approved and published experience with "Social signal — unverified" badge.',
        staged_item: result.stagedItem,
        experience: result.experience
      }
    });
  } catch (err: any) {
    return res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: err.message }
    });
  }
});

// POST /api/v1/admin/social-staging/:id/reject
router.post('/social-staging/:id/reject', (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const item = socialIngestionService.rejectStagedItem(id);
    return res.json({
      success: true,
      data: {
        message: 'Staged entry rejected.',
        staged_item: item
      }
    });
  } catch (err: any) {
    return res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: err.message }
    });
  }
});

export default router;
