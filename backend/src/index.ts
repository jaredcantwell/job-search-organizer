import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import 'express-async-errors';

import { errorHandler } from './middleware/errorHandler';
import { authRouter } from './routes/auth';
import { contactsRouter } from './routes/contacts';
import { applicationsRouter } from './routes/applications';
import { tasksRouter } from './routes/tasks';
import { communicationsRouter } from './routes/communications';
import { exportRouter } from './routes/export';
import { importRouter } from './routes/import';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));

app.use(express.json());

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/auth', authRouter);
app.use('/api/contacts', contactsRouter);
app.use('/api/applications', applicationsRouter);
app.use('/api/tasks', tasksRouter);
app.use('/api/communications', communicationsRouter);
app.use('/api/export', exportRouter);
app.use('/api/import', importRouter);

// Error handling
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});