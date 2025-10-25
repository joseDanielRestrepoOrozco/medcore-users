import express from 'express';
import usersController from '../controllers/users.controller.js';
import { requireRoles } from '../middleware/auth.js';
// import csvUploadMiddleware from '../middleware/upload/csvUpload.middleware.js';
// import bulkUsersController from '../controllers/bulkUsers.controller.js';
import unknownEndpoint from '../middleware/unknownEndpoint.js';

const usersRouter = express.Router();

// ============================================
// RUTAS GENERALES DE USUARIOS (sin prefijo /users)
// ============================================

// IMPORTANTE: Las rutas específicas DEBEN ir antes de /:id para evitar conflictos

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
// desactivado temporalmente 
// usersRouter.post(
//   '/bulkUsers',
//   requireRoles(['ADMINISTRADOR']),
//   csvUploadMiddleware.uploadSingle,
//   bulkUsersController.bulkImportPatients
// );

// CRUD básico de usuarios - Listar todos
usersRouter.get('/', requireRoles(['ADMINISTRADOR']), usersController.getAll);

// Crear usuario
usersRouter.post('/', requireRoles(['ADMINISTRADOR']), usersController.create);

// ============================================
// RUTAS CON PARÁMETROS DINÁMICOS - DEBEN IR AL FINAL
// ============================================

// Esta ruta debe ir AL FINAL porque captura cualquier string como :id
usersRouter.get(
  '/:id',
  requireRoles(['ADMINISTRADOR', 'MEDICO', 'ENFERMERA']),
  usersController.getById
);

usersRouter.put(
  '/:id',
  requireRoles(['ADMINISTRADOR']),
  usersController.update
);

usersRouter.delete(
  '/:id',
  requireRoles(['ADMINISTRADOR']),
  usersController.remove
);

usersRouter.use(unknownEndpoint);

export default usersRouter;
