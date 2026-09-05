import { Router, Request, Response } from 'express';
import { isSupabaseConfigured } from '../db/supabaseClient.js';

const router = Router();

router.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({
    data: {
      status: 'ok',
      service: 'khojyatra-backend',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      supabaseConnected: isSupabaseConfigured()
    }
  });
});

export default router;
