import { type Request, type Response, type NextFunction } from 'express';
import {
  medicoSchema,
  medicoUpdateSchema,
  getDoctorsFiltersSchema,
} from '../schemas/User.js';
import * as usersService from '../services/users.service.js';

const getAllDoctors = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const filters = getDoctorsFiltersSchema.parse(req.query);

    const result = await usersService.getAllUsers({
      role: 'MEDICO',
      status: filters.status,
      page: filters.page,
      limit: filters.limit,
    });

    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

const createDoctor = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const newDoctorData = medicoSchema.parse({ ...req.body, role: 'MEDICO' });

    const createdDoctor = await usersService.createUser(newDoctorData);

    res.status(201).json({
      ...createdDoctor,
      message: 'Doctor creado. Código enviado al correo.',
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
      // Manejar error de especialidad no encontrada
      if (
        error.message.includes('Specialty') &&
        error.message.includes('not found')
      ) {
        res.status(404).json({ error: error.message });
        return;
      }
    }
    next(error);
  }
};

const getDoctorById = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    if (!id) {
      res.status(400).json({ error: 'Doctor ID is required' });
      return;
    }

    const doctor = await usersService.getUserById(id);

    if (!doctor || doctor.role !== 'MEDICO') {
      res.status(404).json({ error: 'Doctor not found' });
      return;
    }

    res.status(200).json(doctor);
  } catch (error) {
    next(error);
  }
};

const updateDoctor = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    if (!id) {
      res.status(400).json({ error: 'Doctor ID is required' });
      return;
    }

    const updateData = medicoUpdateSchema.parse({
      ...req.body,
      role: 'MEDICO',
    });

    const updatedDoctor = await usersService.updateUser(
      id,
      updateData,
      'MEDICO'
    );

    if (!updatedDoctor) {
      res.status(404).json({ error: 'Doctor not found' });
      return;
    }

    res.status(200).json({
      updatedDoctor,
      message: 'Doctor updated successfully',
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'User not found') {
        res.status(404).json({ error: 'Doctor not found' });
        return;
      }
      // Manejar error de especialidad no encontrada
      if (
        error.message.includes('Specialty') &&
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
      res.status(400).json({ error: 'Doctor ID is required' });
      return;
    }

    // Obtener el doctor actual
    const currentDoctor = await usersService.getUserById(id);

    if (!currentDoctor || currentDoctor.role !== 'MEDICO') {
      res.status(404).json({ error: 'Doctor not found' });
      return;
    }

    // Toggle del estado: ACTIVE <-> INACTIVE
    const newStatus = currentDoctor.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';

    // Actualizar con el nuevo estado
    const updatedDoctor = await usersService.updateUser(
      id,
      { status: newStatus },
      'MEDICO'
    );

    if (!updatedDoctor) {
      res.status(404).json({ error: 'Doctor not found' });
      return;
    }

    res.status(200).json({
      updatedDoctor,
      message: `Doctor status updated to ${newStatus}`,
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'User not found') {
        res.status(404).json({ error: 'Doctor not found' });
        return;
      }
    }
    next(error);
  }
};

export default {
  getAllDoctors,
  createDoctor,
  getDoctorById,
  updateDoctor,
  updateStatus,
};
