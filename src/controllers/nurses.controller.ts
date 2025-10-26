import { type Request, type Response, type NextFunction } from 'express';
import { enfermeraSchema, enfermeraUpdateSchema } from '../schemas/User.js';
import * as usersService from '../services/users.service.js';

import { findDepartmentByName } from '../services/specialty.service.js';
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const createNurse = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = enfermeraSchema.parse({ ...req.body, role: 'ENFERMERA' });

    // se verifica la existencia del departamento, puede ser por el nombre o por el id del departamento
    let departmentId: string | null | undefined;
    if (parsed.enfermera && parsed.enfermera.department) {
      departmentId = await findDepartmentByName(parsed.enfermera.department);
      if (!departmentId) {
        res.status(404).json({
          error: `Department '${parsed.enfermera.department}' not found.`,
        });
        return;
      }
    } else if (parsed.enfermera && parsed.enfermera.departmentId) {
      const found = await prisma.department.findUnique({
        where: { id: parsed.enfermera.departmentId },
      });
      if (!found) {
        res.status(404).json({
          error: `Department with id '${parsed.enfermera.departmentId}' not found.`,
        });
        return;
      }
      departmentId = parsed.enfermera.departmentId;
    } else {
      res.status(400).json({
        error:
          'You must provide either department (name) or departmentId for a nurse.',
      });
      return;
    }

    // Construir el objeto para el servicio con departmentId
    const newNurseData = {
      ...parsed,
      enfermera: {
        departmentId,
      },
    };
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

    console.log(error);
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

    // Obtener la enfermera actual
    const currentNurse = await usersService.getUserById(id);

    if (!currentNurse || currentNurse.role !== 'ENFERMERA') {
      res.status(404).json({ error: 'Nurse not found' });
      return;
    }

    // Toggle del estado: ACTIVE <-> INACTIVE
    const newStatus = currentNurse.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';

    // Actualizar con el nuevo estado
    const updatedNurse = await usersService.updateUser(
      id,
      { status: newStatus },
      'ENFERMERA'
    );

    if (!updatedNurse) {
      res.status(404).json({ error: 'Nurse not found' });
      return;
    }

    res.status(200).json({
      updatedNurse,
      message: `Nurse status updated to ${newStatus}`,
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
