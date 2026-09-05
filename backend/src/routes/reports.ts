import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { reportService } from '../services/reportService.js';
import { createSuccessResponse, createErrorResponse } from '@khojyatra/types';
import { requireAdmin } from '../middleware/authRoleMiddleware.js';

const router = Router();

const ReportSchema = z.object({
  reason: z.enum(['fraud', 'inaccurate', 'safety', 'other']),
  details: z.string().min(5)
});

// POST /api/v1/experiences/:id/report
router.post('/experiences/:id/report', (req: Request, res: Response) => {
  const { id } = req.params;
  const parse = ReportSchema.safeParse(req.body);
  if (!parse.success) {
    return res.status(400).json(
      createErrorResponse('VALIDATION_ERROR', 'Invalid report parameters', parse.error.format())
    );
  }

  const sessionId = req.khojContext.sessionId || 'default-session';
  try {
    const report = reportService.createReport({
      experience_id: id,
      reporter_session_id: sessionId,
      reason: parse.data.reason,
      details: parse.data.details
    });

    return res.status(200).json(
      createSuccessResponse({
        report,
        message: 'Report submitted. Our trust & safety team will review this listing.'
      })
    );
  } catch (err: any) {
    return res.status(404).json(createErrorResponse('NOT_FOUND', err.message));
  }
});

// GET /api/v1/admin/reports
router.get('/admin/reports', requireAdmin, (_req: Request, res: Response) => {
  const reports = reportService.getReports();
  return res.status(200).json(createSuccessResponse({ reports }));
});

// POST /api/v1/admin/reports/:id/resolve
router.post('/admin/reports/:id/resolve', requireAdmin, (req: Request, res: Response) => {
  const { id } = req.params;
  const { action } = req.body;
  if (action !== 'unpublish' && action !== 'dismiss') {
    return res.status(400).json(createErrorResponse('VALIDATION_ERROR', 'action must be "unpublish" or "dismiss"'));
  }

  try {
    const resolved = reportService.resolveReport(id, action);
    return res.status(200).json(
      createSuccessResponse({
        report: resolved,
        message: action === 'unpublish' ? 'Experience unpublished from catalog.' : 'Report dismissed.'
      })
    );
  } catch (err: any) {
    return res.status(404).json(createErrorResponse('NOT_FOUND', err.message));
  }
});

export default router;
