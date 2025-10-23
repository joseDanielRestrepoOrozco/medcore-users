import { PrismaClient, Prisma } from '@prisma/client';
type Role = Prisma.Role;
type UserStatus = Prisma.UserStatus;
import bcrypt from 'bcrypt';
import calculateAge from '../libs/calculateAge.js';
import emailConfig from '../config/emailConfig.js';
import { validateAge } from '../schemas/User.js';

const prisma = new PrismaClient();

/**
 * Verifica si un usuario existe por email
 */
export const checkUserExists = async (email: string): Promise<boolean> => {
  const user = await prisma.users.findUnique({
    where: { email },
    select: { id: true },
  });
  return !!user;
};

/**
 * Obtiene todos los usuarios con filtros y paginación
 */
export const getAllUsers = async (filters: {
  page: number;
  limit: number;
  status?: UserStatus;
  role?: Role;
  specialization?: string;
  q?: string;
}) => {
  const { page, limit, status, role, specialization, q } = filters;
  const skip = (page - 1) * limit;

  const whereClause: any = {
    status: status as UserStatus | undefined,
    role: role as Role | undefined,
  };

  // Filtro de especialización (case-insensitive partial match)
  if (specialization) {
    whereClause.specialization = specialization;
  }

  if (q && q.trim().length > 0) {
    const term = q.trim();
    whereClause.OR = [
      { fullname: { contains: term, mode: 'insensitive' } },
      { email: { contains: term, mode: 'insensitive' } },
      { license_number: { contains: term, mode: 'insensitive' } },
      { department: { contains: term, mode: 'insensitive' } },
    ];
  }

  const [users, total] = await Promise.all([
    prisma.users.findMany({
      where: whereClause,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.users.count({
      where: whereClause,
    }),
  ]);

  return {
    users,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
};

/**
 * Obtiene un usuario por ID
 */
export const getUserById = async (id: string) => {
  return await prisma.users.findUnique({
    where: { id },
    omit: {
      current_password: true,
      verificationCode: true,
      verificationCodeExpires: true,
    },
  });
};

/**
 * Actualiza un usuario por ID
 */
export const updateUser = async (
  id: string,
  updateData: Record<string, unknown>,
  role?: Role
) => {
  const existingUser = await prisma.users.findUnique({
    where: { id, role },
    select: { id: true },
  });

  if (!existingUser) {
    return null;
  }

  let status: UserStatus | undefined;
  if (updateData.status) {
    switch (updateData.status) {
      case 'ACTIVE':
        status = UserStatus.ACTIVE;
        break;
      case 'PENDING':
        status = UserStatus.PENDING;
        break;
      case 'INACTIVE':
        status = UserStatus.INACTIVE;
        break;
    }
  }

  let date_of_birth: Date | undefined;
  let age: number | undefined;

  if (updateData.date_of_birth || updateData.date_of_birth === null) {
    date_of_birth = updateData.date_of_birth
      ? new Date(updateData.date_of_birth as string)
      : undefined;

    age = date_of_birth ? calculateAge(date_of_birth.toISOString()) : undefined;
    validateAge.parse(age);
  }

  console.log('llega');
  return await prisma.users.update({
    where: { id },
    data: {
      ...updateData,
      status,
      date_of_birth,
      age,
    },
    omit: {
      current_password: true,
      verificationCode: true,
      verificationCodeExpires: true,
    },
  });
};

/**
 * Desactiva un usuario (soft delete)
 */
export const deactivateUser = async (id: string) => {
  const existingUser = await prisma.users.findUnique({
    where: { id },
    select: { id: true, status: true },
  });

  if (!existingUser) {
    return null;
  }

  return await prisma.users.update({
    where: { id },
    data: { status: 'INACTIVE' },
  });
};

/**
 * Obtiene estadísticas de usuarios
 */
export const getUserStats = async () => {
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

  return {
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
  };
};

/**
 * Crea un nuevo usuario con validación y envío de email
 * Esta función centraliza la lógica común de creación de usuarios
 */
export const createUser = async (userData: {
  email: string;
  fullname: string;
  current_password: string;
  date_of_birth: string | Date;
  role: Role;
  [key: string]: unknown;
}) => {
  // Verificar si el usuario ya existe
  const userExists = await checkUserExists(userData.email);
  if (userExists) {
    throw new Error('User already exists');
  }

  // Calcular y validar edad
  const dateOfBirth =
    typeof userData.date_of_birth === 'string'
      ? userData.date_of_birth
      : userData.date_of_birth.toISOString();
  const age = calculateAge(dateOfBirth);
  validateAge.parse(age);

  // Generar código de verificación
  const verificationCode = emailConfig.generateVerificationCode();
  const verificationCodeExpires = new Date();
  verificationCodeExpires.setMinutes(verificationCodeExpires.getMinutes() + 15);

  // Hash de la contraseña
  const hashedPassword = await bcrypt.hash(userData.current_password, 10);

  // Crear usuario en la base de datos
  const newUser = await prisma.users.create({
    data: {
      ...userData,
      age,
      date_of_birth: new Date(userData.date_of_birth),
      current_password: hashedPassword,
      verificationCode,
      verificationCodeExpires,
    },
  });

  // Enviar email de verificación
  const emailResult = await emailConfig.sendVerificationEmail(
    newUser.email,
    newUser.fullname,
    verificationCode
  );

  if (!emailResult.success) {
    // Si falla el envío del email, eliminar el usuario creado
    await prisma.users.delete({
      where: { id: newUser.id },
    });
    throw new Error('Error sending verification email');
  }

  // Retornar datos sanitizados (sin contraseña ni códigos)
  return {
    id: newUser.id,
    email: newUser.email,
    fullname: newUser.fullname,
    status: newUser.status,
    role: newUser.role,
  };
};

export default {
  checkUserExists,
  getAllUsers,
  getUserById,
  updateUser,
  deactivateUser,
  getUserStats,
  createUser,
};
