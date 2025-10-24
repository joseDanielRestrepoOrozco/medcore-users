import express from 'express';
import usersController from '../controllers/users.controller.js';
import { requireRoles } from '../middleware/auth.js';
import unknownEndpoint from '../middleware/unknownEndpoint.js';

const patientsRouter = express.Router();

// Búsqueda avanzada de pacientes (debe ir antes de /:id)
patientsRouter.get(
  '/search/advanced',
  requireRoles(['MEDICO', 'ENFERMERA', 'ADMINISTRADOR']),
  usersController.searchAdvanced
);

// Crear un nuevo paciente
patientsRouter.post(
  '/',
  requireRoles(['ADMINISTRADOR']),
  usersController.createPatient
);

// Listar todos los pacientes
patientsRouter.get(
  '/',
  requireRoles(['MEDICO', 'ENFERMERA', 'ADMINISTRADOR']),
  usersController.listPatients
);

// Obtener un paciente por ID
patientsRouter.get(
  '/:id',
  requireRoles(['MEDICO', 'ENFERMERA', 'ADMINISTRADOR']),
  usersController.getPatientById
);

// Actualizar un paciente completo
patientsRouter.put(
  '/:id',
  requireRoles(['ADMINISTRADOR']),
  usersController.updatePatient
);

// Actualizar solo el estado de un paciente
patientsRouter.patch(
  '/:id/state',
  requireRoles(['ADMINISTRADOR']),
  usersController.updatePatientState
);

patientsRouter.use(unknownEndpoint);

export default patientsRouter;
