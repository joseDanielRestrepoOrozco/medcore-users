import { type NextFunction, type Request, type Response } from 'express';
import {
  getUsersFiltersSchema,
  getUsersByRoleFiltersSchema,
  pacienteSchema,
  pacienteUpdateSchema,
  getSpecialtyFiltersSchema,
  advancedSearchSchema,
  statusSchema,
} from '../schemas/User.js';
import * as usersService from '../services/users.service.js';

/**
 * Obtener todos los usuarios con filtros y paginación
 */
const getAll = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const filters = getUsersFiltersSchema.parse(req.query);
    const result = await usersService.getAllUsers(filters);
    res.status(200).json(result);
  } catch (error: unknown) {
    next(error);
  }
};

/**
 * Obtener un usuario por ID
 */
const getById = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params as { id: string };
    const user = await usersService.getUserById(id);

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.status(200).json(user);
  } catch (error: unknown) {
    next(error);
  }
};

/**
 * Actualizar un usuario
 */
const update = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params as { id: string };
    const updateData = pacienteUpdateSchema.parse(req.body);

    const updatedUser = await usersService.updateUser(id, updateData);

    if (!updatedUser) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.status(200).json({
      message: 'User updated successfully',
      user: updatedUser,
    });
  } catch (error: unknown) {
    console.error('Error updating user:', error);
    if (error instanceof Error) {
      if (error.message === 'User not found') {
        res.status(404).json({ error: 'User not found' });
        return;
      }
    }
    next(error);
  }
};

/**
 * Eliminar un usuario (soft delete cambiando status a INACTIVE)
 */
const remove = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params as { id: string };
    const result = await usersService.deactivateUser(id);

    if (!result) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.status(200).json({
      message: 'User deactivated successfully',
    });
  } catch (error: unknown) {
    next(error);
  }
};

/**
 * Obtener estadísticas de usuarios
 */
const getStats = async (
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const stats = await usersService.getUserStats();
    res.status(200).json(stats);
  } catch (error: unknown) {
    next(error);
  }
};

/**
 * Crear un nuevo usuario (por defecto paciente)
 */
const create = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const newUser = pacienteSchema.parse({ ...req.body, role: 'PACIENTE' });
    const createdUser = await usersService.createUser(newUser);

    res.status(201).json({
      ...createdUser,
      message: 'Usuario creado. Código enviado al correo.',
    });
  } catch (error: unknown) {
    if (error instanceof Error) {
      if (error.message === 'User already exists') {
        res.status(400).json({ error: 'User already exists' });
        return;
      }
      if (error.message === 'Document number already exists') {
        res.status(400).json({ error: 'Document number already exists' });
        return;
      }
      if (error.message === 'Error sending verification email') {
        res.status(500).json({ error: 'Error sending verification email' });
        return;
      }
    }
    console.error('[signup] unhandled error', error);
    next(error);
  }
};

const getUsersByRole = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const filters = getUsersByRoleFiltersSchema.parse(req.query);
    const users = await usersService.getAllUsers(filters);
    res.status(200).json(users);
  } catch (error: unknown) {
    next(error);
  }
};

const getUsersBySpecialty = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const filters = getSpecialtyFiltersSchema.parse(req.query);
    const users = await usersService.getAllUsers({
      role: 'MEDICO',
      status: filters.status,
      especialtyId: filters.especialtyId,
      page: filters.page,
      limit: filters.limit,
    });
    res.status(200).json(users);
  } catch (error: unknown) {
    next(error);
  }
};

// ============================================
// FUNCIONES ESPECÍFICAS PARA PACIENTES (migradas de medcore-patients)
// ============================================

/**
 * Crear un nuevo paciente (usuario con role PACIENTE)
 */
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

/**
 * Listar pacientes con filtros y paginación
 */
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

/**
 * Obtener un paciente por ID
 */
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

/**
 * Actualizar un paciente
 */
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

/**
 * Actualizar el estado de un paciente
 */
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

    const { status } = statusSchema.parse(req.body);

    const updated = await usersService.updateUser(
      id,
      { status },
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

/**
 * Búsqueda avanzada de pacientes
 */
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
  getAll,
  getById,
  update,
  remove,
  getStats,
  create,
  getUsersByRole,
  getUsersBySpecialty,
  // Funciones de pacientes
  createPatient,
  listPatients,
  getPatientById,
  updatePatient,
  updatePatientState,
  searchAdvanced,
};
