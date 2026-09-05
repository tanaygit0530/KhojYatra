import { Request, Response, NextFunction } from 'express';
import { getSupabaseClient } from '../db/supabaseClient.js';

export interface KhojRequestContext {
  sessionId?: string;
  userId?: string;
  userRole?: string;
  isAnonymous: boolean;
}

declare global {
  namespace Express {
    interface Request {
      khojContext: KhojRequestContext;
    }
  }
}

export const sessionMiddleware = async (req: Request, _res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const sessionIdHeader = req.headers['x-session-id'] as string | undefined;

  let userId: string | undefined;
  let userRole: string | undefined;
  let sessionId = sessionIdHeader;

  // 1. Check Bearer token
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        const { data: { user }, error } = await supabase.auth.getUser(token);
        if (!error && user) {
          userId = user.id;
          userRole = (user.user_metadata?.role as string) || 'traveler';

          // Link session if both exist
          if (sessionId) {
            try {
              await supabase
                .from('sessions')
                .update({ user_id: userId })
                .eq('id', sessionId);
            } catch (linkErr) {
              console.warn('Failed linking session to user:', linkErr);
            }
          }
        }
      } catch (err) {
        console.warn('Auth token verification error:', err);
      }
    }
  }

  // 2. If no user, ensure anonymous session tracking
  const isAnonymous = !userId;

  req.khojContext = {
    sessionId,
    userId,
    userRole,
    isAnonymous
  };

  next();
};
