import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { voiceSyncService } from '../services/voiceSyncService.js';
import { store } from '../data/store.js';
import { createSuccessResponse, createErrorResponse } from '@khojyatra/types';

const router = Router();

const VoiceWebhookSchema = z.object({
  provider_id: z.string().optional(),
  transcript: z.string().optional(),
  sample_message: z.string().optional(),
  audio_base64: z.string().optional()
});

// POST /api/v1/integrations/whatsapp/voice (Phase 23 Webhook)
router.post('/integrations/whatsapp/voice', async (req: Request, res: Response) => {
  const parseResult = VoiceWebhookSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json(
      createErrorResponse('VALIDATION_ERROR', 'Invalid voice webhook payload', parseResult.error.format())
    );
  }

  const { provider_id, transcript, sample_message, audio_base64 } = parseResult.data;
  const effectiveProviderId = provider_id || store.providers[1]?.id || store.providers[0]?.id;

  try {
    const extraction = await voiceSyncService.processVoice({
      provider_id: effectiveProviderId,
      transcript: transcript || sample_message,
      audio_base64
    });

    return res.status(200).json(
      createSuccessResponse({
        extraction,
        message: 'Voice message processed. Staged for provider dashboard review (never auto-published).'
      })
    );
  } catch (err: any) {
    return res.status(500).json(createErrorResponse('INTERNAL', err.message));
  }
});

// GET /api/v1/providers/:id/voice-updates (Phase 23)
router.get('/providers/:id/voice-updates', (req: Request, res: Response) => {
  const { id } = req.params;
  const pending = voiceSyncService.getPendingLogs(id);
  return res.status(200).json(createSuccessResponse(pending, { count: pending.length }));
});

// POST /api/v1/providers/:id/voice-updates/:logId/confirm (Phase 23)
router.post('/providers/:id/voice-updates/:logId/confirm', (req: Request, res: Response) => {
  const { id, logId } = req.params;

  try {
    const result = voiceSyncService.confirmSlot(logId, id);
    return res.status(200).json(createSuccessResponse(result));
  } catch (err: any) {
    return res.status(400).json(createErrorResponse('INTERNAL', err.message));
  }
});

export default router;
