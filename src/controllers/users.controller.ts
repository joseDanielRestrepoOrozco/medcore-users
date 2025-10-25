import { type NextFunction, type Request, type Response } from 'express';
import {
  getUsersFiltersSchema,
  getUsersByRoleFiltersSchema,
  getSpecialtyFiltersSchema,
  userSchema,
} from '../schemas/User.js';
import * as usersService from '../services/users.service.js';
import {
  findSpecialtyByName,
  findDepartmentByName,
} from '../services/specialty.service.js';

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
 * Crear un nuevo usuario (genérico para todos los roles)
 */
const create = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Parsear y validar según el rol
    const userData = userSchema.parse(req.body);

    // Preparar datos transformados para el servicio
    const transformedData: {
      email: string;
      fullname: string;
      documentNumber: string;
      current_password: string;
      date_of_birth: Date;
      role: 'MEDICO' | 'ENFERMERA' | 'PACIENTE' | 'ADMINISTRADOR';
      gender?: string;
      phone?: string;
      medico?: { specialtyId: string; license_number: string };
      enfermera?: { departmentId: string };
      paciente?: { gender: string; address?: string };
      administrador?: { nivelAcceso?: string; departamentoAsignado?: string };
    } = {
      email: userData.email,
      fullname: userData.fullname,
      documentNumber: userData.documentNumber,
      current_password: userData.current_password,
      date_of_birth: userData.date_of_birth,
      role: userData.role,
      gender: userData.gender,
      phone: userData.phone,
    };

    // Transformaciones específicas por rol
    if (userData.role === 'MEDICO') {
      const medicoData = userData.medico;

      // Si viene specialty (nombre), convertir a specialtyId
      if ('specialty' in medicoData && medicoData.specialty) {
        const specialtyId = await findSpecialtyByName(medicoData.specialty);
        if (!specialtyId) {
          res.status(400).json({
            error: 'Invalid specialty',
            message: `Specialty '${medicoData.specialty}' not found. Please verify the specialty name.`,
          });
          return;
        }
        transformedData.medico = {
          specialtyId,
          license_number: medicoData.license_number,
        };
      } else {
        // Si no viene specialty, asumimos que viene specialtyId (el schema ya lo valida)
        transformedData.medico = {
          specialtyId: (
            medicoData as { specialtyId: string; license_number: string }
          ).specialtyId,
          license_number: medicoData.license_number,
        };
      }
    } else if (userData.role === 'ENFERMERA') {
      const enfermeraData = userData.enfermera;

      // Si viene department (nombre), convertir a departmentId
      if ('department' in enfermeraData && enfermeraData.department) {
        const departmentId = await findDepartmentByName(
          enfermeraData.department
        );
        if (!departmentId) {
          res.status(400).json({
            error: 'Invalid department',
            message: `Department '${enfermeraData.department}' not found. Please verify the department name.`,
          });
          return;
        }
        transformedData.enfermera = {
          departmentId,
        };
      } else {
        // Si no viene department, asumimos que viene departmentId (el schema ya lo valida)
        transformedData.enfermera = {
          departmentId: (enfermeraData as { departmentId: string })
            .departmentId,
        };
      }
    } else if (userData.role === 'PACIENTE') {
      if (userData.paciente) {
        transformedData.paciente = userData.paciente;
      }
    } else if (userData.role === 'ADMINISTRADOR') {
      if (userData.administrador) {
        transformedData.administrador = userData.administrador;
      }
    }

    const createdUser = await usersService.createUser(transformedData);

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
    console.error('[create] unhandled error', error);
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

export default {
  getAll,
  getById,
  remove,
  getStats,
  create,
  getUsersByRole,
  getUsersBySpecialty,
};
