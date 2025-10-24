import express from 'express';
import usersController from '../controllers/users.controller.js';
import { requireRoles } from '../middleware/auth.js';
import csvUploadMiddleware from '../middleware/upload/csvUpload.middleware.js';
import bulkUsersController from '../controllers/bulkUsers.controller.js';

const router = express.Router();

router.get(
  '/by-role',
  requireRoles(['ADMINISTRADOR']),
  usersController.getUsersByRole
);

router.get(
  '/by-specialty',
  requireRoles(['ADMINISTRADOR']),
  usersController.getUsersBySpecialty
);

// obtener todos los usuarios
router.get('/', requireRoles(['ADMINISTRADOR']), usersController.getAll);

// obtener un usuario por ID
router.get(
  '/:id',
  requireRoles(['ADMINISTRADOR', 'MEDICO', 'ENFERMERA']),
  usersController.getById
);

// crear un nuevo usuario
router.post('/', requireRoles(['ADMINISTRADOR']), usersController.create);

// actualizar un usuario por ID
router.put('/:id', requireRoles(['ADMINISTRADOR']), usersController.update);

// eliminar un usuario por ID
router.delete('/:id', requireRoles(['ADMINISTRADOR']), usersController.remove);

// obtener estadísticas de usuarios
router.get('/stats', requireRoles(['ADMINISTRADOR']), usersController.getStats);


// importar usuarios en masa desde un archivo CSV
router.post(
  '/bulkUsers',
  requireRoles(['ADMINISTRADOR']),
  csvUploadMiddleware.uploadAny,
  bulkUsersController.bulkImportPatients
);

export default router;
