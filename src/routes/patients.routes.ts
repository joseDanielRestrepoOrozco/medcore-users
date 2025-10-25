import express from 'express';
import { requireRoles } from '../middleware/auth.js';
import unknownEndpoint from '../middleware/unknownEndpoint.js';
import patientsController from '../controllers/patients.controller.js';

const patientsRouter = express.Router();

// Búsqueda avanzada de pacientes (debe ir antes de /:id)
patientsRouter.get(
  '/search/advanced',
  requireRoles(['MEDICO', 'ENFERMERA', 'ADMINISTRADOR']),
  patientsController.searchAdvanced
);

// Crear un nuevo paciente
patientsRouter.post(
  '/',
  requireRoles(['ADMINISTRADOR']),
  patientsController.createPatient
);

// Listar todos los pacientes
patientsRouter.get(
  '/',
  requireRoles(['MEDICO', 'ENFERMERA', 'ADMINISTRADOR']),
  patientsController.listPatients
);

// Obtener un paciente por ID
patientsRouter.get(
  '/:id',
  requireRoles(['MEDICO', 'ENFERMERA', 'ADMINISTRADOR']),
  patientsController.getPatientById
);

// Actualizar un paciente completo
patientsRouter.put(
  '/:id',
  requireRoles(['ADMINISTRADOR']),
  patientsController.updatePatient
);

// Actualizar solo el estado de un paciente
patientsRouter.patch(
  '/:id/state',
  requireRoles(['ADMINISTRADOR']),
  patientsController.updatePatientState
);

patientsRouter.use(unknownEndpoint);

export default patientsRouter;
