import type { NextFunction, Request, Response } from 'express';
import {
  advancedSearchSchema,
  getUsersFiltersSchema,
  pacienteSchema,
  pacienteUpdateSchema,
} from '../schemas/User.js';
import usersService from '../services/users.service.js';
import { UserStatus } from '@prisma/client';

const createPatient = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const patientData = pacienteSchema.parse({ ...req.body, role: 'PACIENTE' });

    const createdPatient = await usersService.createUser(patientData);

    res.status(201).json({
      message: 'Paciente creado',
      patient: createdPatient,
    });
  } catch (error: unknown) {
    if (error instanceof Error) {
      if (error.message === 'User already exists') {
        res.status(409).json({
          error: 'Paciente ya existe',
          message: 'Ya existe un paciente con este correo electrónico',
        });
        return;
      }
      if (error.message === 'Document number already exists') {
        res.status(409).json({
          error: 'Paciente ya existe',
          message: 'Ya existe un paciente con este número de documento',
        });
        return;
      }
    }
    next(error);
  }
};

const listPatients = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const filters = getUsersFiltersSchema.parse(req.query);
    const result = await usersService.getAllUsers({
      ...filters,
      role: 'PACIENTE',
    });

    res.status(200).json({
      patients: result.users,
      pagination: result.pagination,
    });
  } catch (error: unknown) {
    next(error);
  }
};

const getPatientById = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    if (!id) {
      res.status(400).json({ error: 'ID de paciente requerido' });
      return;
    }

    const patient = await usersService.getPatientById(id);

    if (!patient) {
      res.status(404).json({ error: 'Paciente no encontrado' });
      return;
    }

    res.status(200).json({ patient });
  } catch (error: unknown) {
    next(error);
  }
};

const updatePatient = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    if (!id) {
      res.status(400).json({ error: 'ID de paciente requerido' });
      return;
    }

    const data = pacienteUpdateSchema.parse(req.body);

    const updated = await usersService.updateUser(id, data, 'PACIENTE');

    if (!updated) {
      res.status(404).json({ error: 'Paciente no encontrado' });
      return;
    }

    res.status(200).json({ message: 'Paciente actualizado', patient: updated });
  } catch (error: unknown) {
    next(error);
  }
};

const updatePatientState = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    if (!id) {
      res.status(400).json({ error: 'ID de paciente requerido' });
      return;
    }

    const patient = await usersService.getPatientById(id);

    if (!patient) {
      res.status(404).json({ error: 'Paciente no encontrado' });
      return;
    }

    const newStatus =
      patient.status === UserStatus.ACTIVE
        ? UserStatus.INACTIVE
        : UserStatus.ACTIVE;

    const updated = await usersService.updateUser(
      id,
      { status: newStatus },
      'PACIENTE'
    );

    if (!updated) {
      res.status(404).json({ error: 'Paciente no encontrado' });
      return;
    }

    res.status(200).json({ message: 'Estado actualizado', patient: updated });
  } catch (error: unknown) {
    next(error);
  }
};

const searchAdvanced = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const filters = advancedSearchSchema.parse(req.query);

    const result = await usersService.searchPatientsAdvanced(filters);

    res.status(200).json(result);
  } catch (error: unknown) {
    next(error);
  }
};

export default {
  createPatient,
  listPatients,
  getPatientById,
  updatePatient,
  updatePatientState,
  searchAdvanced,
};
