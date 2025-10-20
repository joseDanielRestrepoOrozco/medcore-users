import { PrismaClient, Role, UserStatus } from '@prisma/client';
import { type NextFunction, type Request, type Response } from 'express';
import {
  getUsersFiltersSchema,
  usersUpdateSchema,
  userSchema,
  validateAge,
} from '../schemas/User.js';
import calculateAge from '../libs/calculateAge.js';
import emailConfig from '../config/emailConfig.js';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

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
    const page = filters.page;
    const limit = filters.limit;
    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      prisma.users.findMany({
        where: {
          status: filters.status as UserStatus | undefined,
          role: filters.role as Role | undefined,
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.users.count({
        where: {
          status: filters.status as UserStatus | undefined,
          role: filters.role as Role | undefined,
        },
      }),
    ]);

    res.status(200).json({
      users,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
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
    const { id } = req.params;

    const user = await prisma.users.findUnique({
      where: { id },
      omit: {
        current_password: true,
        verificationCode: true,
        verificationCodeExpires: true,
      },
    });

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
    const { id } = req.params;
    const updateData = usersUpdateSchema.parse(req.body);

    // Verificar que el usuario existe
    const existingUser = await prisma.users.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!existingUser) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    // Actualizar usuario
    const updatedUser = await prisma.users.update({
      where: { id },
      data: updateData,
      omit: {
        current_password: true,
        verificationCode: true,
        verificationCodeExpires: true,
      },
    });

    res.status(200).json({
      message: 'User updated successfully',
      user: updatedUser,
    });
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
    const { id } = req.params;

    // Verificar que el usuario existe
    const existingUser = await prisma.users.findUnique({
      where: { id },
      select: { id: true, status: true },
    });

    if (!existingUser) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    // Soft delete: cambiar estado a INACTIVE
    await prisma.users.update({
      where: { id },
      data: { status: 'INACTIVE' },
    });

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
    const [totalUsers, activeUsers, pendingUsers, inactiveUsers, usersByRole] =
      await Promise.all([
        prisma.users.count(),
        prisma.users.count({ where: { status: 'ACTIVE' } }),
        prisma.users.count({ where: { status: 'PENDING' } }),
        prisma.users.count({ where: { status: 'INACTIVE' } }),
        prisma.users.groupBy({
          by: ['role'],
          _count: { role: true },
        }),
      ]);

    res.status(200).json({
      total: totalUsers,
      byStatus: {
        active: activeUsers,
        pending: pendingUsers,
        inactive: inactiveUsers,
      },
      byRole: usersByRole.map(
        (item: { role: string; _count: { role: number } }) => ({
          role: item.role,
          count: item._count.role,
        })
      ),
    });
  } catch (error: unknown) {
    next(error);
  }
};

const create = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const bodyWhitRole = { role: req.body.role || 'PACIENTE', ...req.body };
    const newUser = userSchema.parse(bodyWhitRole);

    const userExist = await prisma.users.findUnique({
      where: { email: newUser.email },
      select: { id: true },
    });

    if (userExist) {
      res.status(400).json({ error: 'User already exists' });
      return;
    }

    const age = calculateAge(newUser.date_of_birth);
    validateAge.parse(age);

    const verificationCode = emailConfig.generateVerificationCode();

    const verificationCodeExpires = new Date();
    verificationCodeExpires.setMinutes(
      verificationCodeExpires.getMinutes() + 15
    );

    const createUser = await prisma.users.create({
      data: {
        ...newUser,
        age,
        date_of_birth: new Date(newUser.date_of_birth),
        current_password: await bcrypt.hash(newUser.current_password, 10),
        verificationCode,
        verificationCodeExpires,
      },
    });

    const emailResult = await emailConfig.sendVerificationEmail(
      newUser.email,
      newUser.fullname,
      verificationCode
    );

    if (!emailResult.success) {
      console.error('[signup] email sending failed:', emailResult.error);
      await prisma.users.delete({
        where: { id: createUser.id },
      });
      res.status(500).json({ error: 'Error sending verification email' });
      return;
    }

    // Sanitize response (no password or codes)
    res.status(201).json({
      id: createUser.id,
      email: createUser.email,
      fullname: createUser.fullname,
      status: createUser.status,
      role: createUser.role,
      message: 'Usuario creado. Código enviado al correo.',
    });
  } catch (error: unknown) {
    console.error('[signup] unhandled error', error);
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
};
