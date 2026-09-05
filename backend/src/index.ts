import express from 'express';
import cors from 'cors';
import { env } from './config/env.js';
import { sessionMiddleware } from './middleware/session.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import healthRouter from './routes/health.js';
import experiencesRouter from './routes/experiences.js';
import authRouter from './routes/auth.js';
import recommendationsRouter from './routes/recommendations.js';
import itineraryRouter from './routes/itinerary.js';
import providersRouter from './routes/providers.js';
import groupsRouter from './routes/groups.js';
import aiRouter from './routes/ai.js';
import communityRouter from './routes/community.js';
import integrationsRouter from './routes/integrations.js';
import adminRouter from './routes/admin.js';
import publicShareRouter from './routes/publicShare.js';
import bookingsRouter from './routes/bookings.js';
import reportsRouter from './routes/reports.js';

const app = express();

// Security & Parsing
const allowedOrigins = env.CORS_ORIGIN.split(',').map(o => o.trim());
app.use(cors({
  origin: env.CORS_ORIGIN === '*'
    ? true
    : (origin, callback) => {
        if (!origin) return callback(null, true);
        if (allowedOrigins.includes('*') || allowedOrigins.includes(origin) || origin.endsWith('.vercel.app')) {
          return callback(null, true);
        }
        return callback(new Error(`Not allowed by CORS: ${origin}`));
      },
  credentials: true
}));
app.use(express.json());

// Session & Identity Context
app.use(sessionMiddleware);

// API v1 Routes
app.use('/api/v1', healthRouter);
app.use('/api/v1', experiencesRouter);
app.use('/api/v1', authRouter);
app.use('/api/v1', recommendationsRouter);
app.use('/api/v1', itineraryRouter);
app.use('/api/v1', providersRouter);
app.use('/api/v1', groupsRouter);
app.use('/api/v1', aiRouter);
app.use('/api/v1', communityRouter);
app.use('/api/v1', integrationsRouter);
app.use('/api/v1/admin', adminRouter);
app.use('/api/v1', publicShareRouter);
app.use('/api/v1', bookingsRouter);
app.use('/api/v1', reportsRouter);

// 404 & Error Handling
app.use(notFoundHandler);
app.use(errorHandler);

// Start Server
const server = app.listen(env.PORT, () => {
  console.log(`🚀 KhojYatra backend API running on port ${env.PORT} [env: ${env.NODE_ENV}]`);
  console.log(`📡 Base API endpoint: http://localhost:${env.PORT}/api/v1/health`);
});

export default app;
