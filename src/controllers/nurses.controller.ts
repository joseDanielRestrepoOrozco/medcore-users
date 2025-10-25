import { type Request, type Response, type NextFunction } from 'express';
import {
  enfermeraSchema,
  enfermeraUpdateSchema,
  statusSchema,
} from '../schemas/User.js';
import * as usersService from '../services/users.service.js';

const createNurse = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const newNurseData = enfermeraSchema.parse({
      ...req.body,
      role: 'ENFERMERA',
    });
    const createdNurse = await usersService.createUser(newNurseData);

    res.status(201).json({
      ...createdNurse,
      message: 'Nurse created. Verification code sent to email.',
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'User already exists') {
        res.status(400).json({ error: 'User already exists' });
        return;
      }
      if (error.message === 'Error sending verification email') {
        res.status(500).json({ error: 'Error sending verification email' });
        return;
      }
      // Manejar error de departamento no encontrado
      if (
        error.message.includes('Department') &&
        error.message.includes('not found')
      ) {
        res.status(404).json({ error: error.message });
        return;
      }
    }
    next(error);
  }
};

const getNurseById = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    if (!id) {
      res.status(400).json({ error: 'Nurse ID is required' });
      return;
    }

    const nurse = await usersService.getUserById(id);

    if (!nurse || nurse.role !== 'ENFERMERA') {
      res.status(404).json({ error: 'Nurse not found' });
      return;
    }

    res.status(200).json(nurse);
  } catch (error) {
    next(error);
  }
};

const updateNurse = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    if (!id) {
      res.status(400).json({ error: 'Nurse ID is required' });
      return;
    }

    const updateData = enfermeraUpdateSchema.parse({
      ...req.body,
      role: 'ENFERMERA',
    });

    const updatedNurse = await usersService.updateUser(
      id,
      updateData,
      'ENFERMERA'
    );

    if (!updatedNurse) {
      res.status(404).json({ error: 'Nurse not found' });
      return;
    }

    res.status(200).json({
      updatedNurse,
      message: 'Nurse updated successfully',
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'User not found') {
        res.status(404).json({ error: 'Nurse not found' });
        return;
      }
      // Manejar error de departamento no encontrado
      if (
        error.message.includes('Department') &&
        error.message.includes('not found')
      ) {
        res.status(404).json({ error: error.message });
        return;
      }
    }
    next(error);
  }
};

const updateStatus = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    if (!id) {
      res.status(400).json({ error: 'Nurse ID is required' });
      return;
    }

    const status = statusSchema.parse(req.body);

    const updatedNurse = await usersService.updateUser(id, status, 'ENFERMERA');

    if (!updatedNurse) {
      res.status(404).json({ error: 'Nurse not found' });
      return;
    }

    res.status(200).json({
      updatedNurse,
      message: 'Nurse status updated successfully',
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'User not found') {
        res.status(404).json({ error: 'Nurse not found' });
        return;
      }
    }
    next(error);
  }
};

export default {
  createNurse,
  getNurseById,
  updateNurse,
  updateStatus,
};
