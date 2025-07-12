import { Router } from 'express';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.get('/', async (req, res) => {
  res.json({ message: 'Applications endpoint - to be implemented' });
});

export { router as applicationsRouter };