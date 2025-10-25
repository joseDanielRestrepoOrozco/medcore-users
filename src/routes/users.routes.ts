import express from 'express';
import usersController from '../controllers/users.controller.js';
import { requireRoles } from '../middleware/auth.js';
// import csvUploadMiddleware from '../middleware/upload/csvUpload.middleware.js';
// import bulkUsersController from '../controllers/bulkUsers.controller.js';
import unknownEndpoint from '../middleware/unknownEndpoint.js';
import csvUploadMiddleware from '../middleware/upload/csvUpload.middleware.js';
import bulkUsersController from '../controllers/bulkUsers.controller.js';

const usersRouter = express.Router();

// Rutas de filtros específicos
usersRouter.get(
  '/by-role',
  requireRoles(['ADMINISTRADOR']),
  usersController.getUsersByRole
);

usersRouter.get(
  '/by-specialty',
  requireRoles(['ADMINISTRADOR']),
  usersController.getUsersBySpecialty
);

usersRouter.get(
  '/stats',
  requireRoles(['ADMINISTRADOR']),
  usersController.getStats
);

// Importar usuarios en masa desde un archivo CSV
usersRouter.post(
  '/bulkUsers',
  requireRoles(['ADMINISTRADOR']),
  csvUploadMiddleware.uploadSingle,
  bulkUsersController.bulkImportPatients
);

usersRouter.get('/', requireRoles(['ADMINISTRADOR']), usersController.getAll);

usersRouter.post('/', requireRoles(['ADMINISTRADOR']), usersController.create);

usersRouter.get(
  '/:id',
  requireRoles(['ADMINISTRADOR', 'MEDICO', 'ENFERMERA']),
  usersController.getById
);

usersRouter.delete(
  '/:id',
  requireRoles(['ADMINISTRADOR']),
  usersController.remove
);

usersRouter.use(unknownEndpoint);

export default usersRouter;
