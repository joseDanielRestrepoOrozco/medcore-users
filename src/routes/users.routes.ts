import express from 'express';
import usersController from '../controllers/users.controller.js';
import { requireRoles } from '../middleware/auth.js';
import csvUploadMiddleware from '../middleware/upload/csvUpload.middleware.js';
import bulkUsersController from '../controllers/bulkUsers.controller.js';

const router = express.Router();

router.get('/', requireRoles(['ADMINISTRADOR']), usersController.getAll);

router.get(
  '/:id',
  requireRoles(['ADMINISTRADOR', 'MEDICO', 'ENFERMERA']),
  usersController.getById
);

router.post('/', requireRoles(['ADMINISTRADOR']), usersController.create);

router.put('/:id', requireRoles(['ADMINISTRADOR']), usersController.update);

router.delete('/:id', requireRoles(['ADMINISTRADOR']), usersController.remove);

router.get('/stats', requireRoles(['ADMINISTRADOR']), usersController.getStats);

router.post(
  '/bulkUsers',
  requireRoles(['ADMINISTRADOR']),
  csvUploadMiddleware.uploadSingle,
  bulkUsersController.bulkImportPatients
);

export default router;
