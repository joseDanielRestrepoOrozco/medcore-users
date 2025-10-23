import express from 'express';
import nursesController from '../controllers/nurses.controller.js';
import { requireRoles } from '../middleware/auth.js';
import unknownEndpoint from '../middleware/unknownEndpoint.js';
const nursesRouter = express.Router();

// Define your nurses routes here
nursesRouter.post(
  '/',
  requireRoles(['ADMINISTRADOR']),
  nursesController.createNurse
);

nursesRouter.get(
  '/:id',
  requireRoles(['ADMINISTRADOR', 'MEDICO', 'ENFERMERA']),
  nursesController.getNurseById
);

nursesRouter.put(
  '/:id',
  requireRoles(['ADMINISTRADOR']),
  nursesController.updateNurse
);

nursesRouter.patch(
  '/status/:id',
  requireRoles(['ADMINISTRADOR']),
  nursesController.updateStatus
);

nursesRouter.use(unknownEndpoint);

export default nursesRouter;
