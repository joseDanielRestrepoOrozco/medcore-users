import { type NextFunction, type Request, type Response } from 'express';
import {
  getUsersFiltersSchema,
  getUsersByRoleFiltersSchema,
  pacienteSchema,
  pacienteUpdateSchema,
  getSpecialtyFiltersSchema,
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
    // type of error checking can be added here if needed
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

// creara un nuevo usuario por defecto paciente
const create = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Adaptar nombres alternativos del frontend: currentPassword, dateOfBirth, birthDate
    const b = req.body as Record<string, unknown>;
    const adapted = {
      ...b,
      role: 'PACIENTE',
      current_password: b.current_password ?? b.currentPassword,
      date_of_birth: b.date_of_birth ?? b.dateOfBirth ?? b.birthDate,
    };
    const newUser = pacienteSchema.parse(adapted);
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
      specialization: filters.specialty,
      page: filters.page,
      limit: filters.limit,
    });
    res.status(200).json(users);
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
};
