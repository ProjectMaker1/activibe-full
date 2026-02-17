// backend/src/app.js
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

import adminRoutes from './routes/adminRoutes.js';
import authRoutes from './routes/authRoutes.js';
import campaignRoutes from './routes/campaignRoutes.js';
import { errorHandler } from './middleware/errorHandler.js';
import chatRoutes from './routes/chatRoutes.js';

dotenv.config();

const app = express();

const allowedOrigins = [
  'http://localhost:5173',
  process.env.FRONTEND_URL,
  process.env.PUBLIC_APP_URL,
].filter(Boolean);

app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true); // postman/curl
      if (allowedOrigins.includes(origin)) return cb(null, true);
      return cb(new Error(`CORS blocked: ${origin}`));
    },
    credentials: true,
  })
);


// ❗ JSON/URL-encoded body parsers – აუცილებლად ROUTES-ზე ზემოთ
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'ActiVibe API is running' });
});

// Routes
app.use('/api', authRoutes);
app.use('/api', campaignRoutes);
app.use('/api', chatRoutes)
app.use('/api/admin', adminRoutes);

// Error handler
app.use(errorHandler);

export default app;
