import express from 'express';
import usersController from '../controllers/users.controller.js';
import { requireRoles } from '../middleware/auth.js';

const router = express.Router();

router.get('/', requireRoles(['ADMINISTRADOR']), usersController.getAll);

router.get(
  '/:id',
  requireRoles(['ADMINISTRADOR', 'MEDICO', 'ENFERMERA']),
  usersController.getById
);

router.put('/:id', requireRoles(['ADMINISTRADOR']), usersController.update);

router.delete('/:id', requireRoles(['ADMINISTRADOR']), usersController.remove);

export default router;
