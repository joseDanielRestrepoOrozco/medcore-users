import express from 'express';
import doctorsController from '../controllers/doctors.controller.js';
import { requireRoles } from '../middleware/auth.js';
import unknownEndpoint from '../middleware/unknownEndpoint.js';
const doctorsRouter = express.Router();

// Define your doctors routes here
doctorsRouter.get(
  '/',
  requireRoles(['ADMINISTRADOR', 'MEDICO', 'ENFERMERA']),
  doctorsController.getAllDoctors
);

doctorsRouter.post(
  '/',
  requireRoles(['ADMINISTRADOR']),
  doctorsController.createDoctor
);

doctorsRouter.get(
  '/:id',
  requireRoles(['ADMINISTRADOR', 'MEDICO', 'ENFERMERA']),
  doctorsController.getDoctorById
);

doctorsRouter.put(
  '/:id',
  requireRoles(['ADMINISTRADOR']),
  doctorsController.updateDoctor
);

doctorsRouter.patch('/status/:id',
  requireRoles(['ADMINISTRADOR']),
  doctorsController.updateStatus
);

doctorsRouter.use(unknownEndpoint);

export default doctorsRouter;
