import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import v1Routes from './routes/v1.routes';
import internalRoutes from './routes/internal.routes';

const app = express();

// Global Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// External APIs
// External APIs (AarthikLabs)
app.use('/api/v1', v1Routes);

// Internal APIs (Admin Dashboard)
app.use('/api/internal', internalRoutes);

// Health Check Endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

export default app;

