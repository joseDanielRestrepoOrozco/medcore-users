import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import usersController from '../controllers/users.controller.js';

const router = express.Router();

// Internal endpoint for other microservices to fetch a user by id.
// Protect with a simple header token: X-Internal-Token matching INTERNAL_SERVICE_TOKEN.
router.get('/users/:id', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const token = String(req.get('x-internal-token') || '');
    const secret = process.env.INTERNAL_SERVICE_TOKEN || '';
    if (!secret || token !== secret) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    // Delegate to existing controller logic without role checks
    await usersController.getById(req, res, next);
    return;
  } catch (err) {
    next(err);
    return;
  }
});

export default router;
