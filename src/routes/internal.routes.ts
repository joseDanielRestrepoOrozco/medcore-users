import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import usersController from '../controllers/users.controller.js';
import { getUserById } from '../services/users.service.js';

const router = express.Router();

// Middleware to validate internal token
const validateInternalToken = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const token = String(req.get('x-internal-token') || '');
  const secret = process.env.INTERNAL_SERVICE_TOKEN || '';
  if (!secret || token !== secret) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  next();
};

// Internal endpoint for other microservices to fetch a user by id.
// Protect with a simple header token: X-Internal-Token matching INTERNAL_SERVICE_TOKEN.
router.get(
  '/users/:id',
  validateInternalToken,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Delegate to existing controller logic without role checks
      await usersController.getById(req, res, next);
      return;
    } catch (err) {
      next(err);
      return;
    }
  }
);

// Internal endpoint to get doctor's name by id
// Returns only id, fullname, and specialty information
router.get(
  '/doctors/:id/name',
  validateInternalToken,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;

      if (!id) {
        res.status(400).json({ error: 'Doctor ID is required' });
        return;
      }

      const doctor = await getUserById(id);

      if (!doctor || doctor.role !== 'MEDICO') {
        res.status(404).json({ error: 'Doctor not found' });
        return;
      }

      // Return only necessary information
      res.status(200).json({
        id: doctor.id,
        fullname: doctor.fullname,
        specialtyId: doctor.medico?.specialtyId || null,
      });
      return;
    } catch (err) {
      next(err);
      return;
    }
  }
);

export default router;
