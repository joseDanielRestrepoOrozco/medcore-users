import express from 'express';
import usersRouter from './users.routes.js';
import doctorsRouter from './doctors.routes.js';
import nursesRouter from './nurses.routes.js';

const router = express.Router();

router.use('/users/doctors', doctorsRouter);
router.use('/users/nurses', nursesRouter);
router.use('/users', usersRouter);

export default router;
