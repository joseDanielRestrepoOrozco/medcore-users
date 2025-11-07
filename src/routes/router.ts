import express from 'express';
import usersRouter from './users.routes.js';
import doctorsRouter from './doctors.routes.js';
import nursesRouter from './nurses.routes.js';
import patientsRouter from './patients.routes.js';
import internalRouter from './internal.routes.js';

const router = express.Router();

// Rutas específicas por rol (con prefijo /users)
router.use('/users/doctors', doctorsRouter);
router.use('/users/nurses', nursesRouter);
router.use('/users/patients', patientsRouter);

// Rutas generales de usuarios (sin prefijo adicional)
router.use('/users', usersRouter);

// Rutas internas para consumo entre microservicios
router.use('/internal', internalRouter);

export default router;
