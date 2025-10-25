import { PrismaClient, Role, UserStatus } from '@prisma/client';
import bcrypt from 'bcrypt';
import calculateAge from '../libs/calculateAge.js';
import emailConfig from '../config/emailConfig.js';
import { validateAge } from '../schemas/User.js';
import {
  findSpecialtyByName,
  findDepartmentByName,
} from './specialty.service.js';

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
 * Verifica si un usuario existe por número de documento
 */
export const checkDocumentExists = async (
  documentNumber: string
): Promise<boolean> => {
  const user = await prisma.users.findUnique({
    where: { documentNumber },
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
  especialtyId?: string;
  gender?: string;
}) => {
  const { page, limit, status, role, especialtyId, gender } = filters;
  const skip = (page - 1) * limit;

  // Construcción dinámica del whereClause
  const whereClause: Record<string, unknown> = {};

  if (status) whereClause.status = status;
  if (role) whereClause.role = role;
  if (gender) whereClause.gender = gender;

  // Filtro de especialidad para médicos usando equals
  if (especialtyId && role === 'MEDICO') {
    whereClause.medico = {
      is: {
        especialtyId: especialtyId,
      },
    };
  }

  const [users, total] = await Promise.all([
    prisma.users.findMany({
      where: whereClause,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      omit: {
        current_password: true,
        verificationCode: true,
        verificationCodeExpires: true,
      },
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
 * Búsqueda avanzada de pacientes (migrado de medcore-patients)
 */
export const searchPatientsAdvanced = async (filters: {
  page: number;
  limit: number;
  documentNumber?: string;
  gender?: string;
  address?: string;
  dateFrom?: Date;
  dateTo?: Date;
}) => {
  const { page, limit, documentNumber, gender, address, dateFrom, dateTo } =
    filters;
  const skip = (page - 1) * limit;

  // Construcción dinámica del whereClause
  const whereClause: Record<string, unknown> = {
    role: 'PACIENTE',
  };

  if (documentNumber) {
    whereClause.documentNumber = documentNumber;
  }

  if (gender) {
    whereClause.gender = gender;
  }

  // Para buscar en el campo embebido address, usar is con contains
  if (address) {
    whereClause.paciente = {
      is: {
        address: {
          contains: address,
          mode: 'insensitive',
        },
      },
    };
  }

  // Filtro por rango de fechas
  if (dateFrom || dateTo) {
    const createdAtFilter: Record<string, Date> = {};
    if (dateFrom) {
      createdAtFilter.gte = dateFrom;
    }
    if (dateTo) {
      const endDate = new Date(dateTo);
      endDate.setHours(23, 59, 59, 999);
      createdAtFilter.lte = endDate;
    }
    whereClause.createdAt = createdAtFilter;
  }

  const [patients, total] = await Promise.all([
    prisma.users.findMany({
      where: whereClause,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      omit: {
        current_password: true,
        verificationCode: true,
        verificationCodeExpires: true,
      },
    }),
    prisma.users.count({ where: whereClause }),
  ]);

  return {
    patients,
    filters: {
      documentNumber,
      gender,
      address,
      dateFrom,
      dateTo,
    },
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
 * Obtiene un paciente por ID (solo usuarios con role PACIENTE)
 */
export const getPatientById = async (id: string) => {
  return await prisma.users.findFirst({
    where: { id, role: 'PACIENTE' },
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
  const whereClause: { id: string; role?: Role } = { id };
  if (role) whereClause.role = role;

  const existingUser = await prisma.users.findFirst({
    where: whereClause,
    select: { id: true, role: true },
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
    if (age) validateAge.parse(age);
  }

  // Preparar datos embebidos según el rol
  const dataToUpdate: Record<string, unknown> = { ...updateData };

  // Manejar campos embebidos específicos por rol
  if (existingUser.role === 'MEDICO' && updateData.medico) {
    const medicoData = updateData.medico as Record<string, unknown>;

    // Si se envía specialty, buscar el specialtyId
    if (medicoData.specialty && typeof medicoData.specialty === 'string') {
      const specialtyId = await findSpecialtyByName(medicoData.specialty);
      if (!specialtyId) {
        throw new Error(
          `Specialty '${medicoData.specialty}' not found. Please verify the specialty name.`
        );
      }
      medicoData.specialtyId = specialtyId;
      delete medicoData.specialty;
    }

    dataToUpdate.medico = medicoData;
  } else if (existingUser.role === 'ENFERMERA' && updateData.enfermera) {
    const enfermeraData = updateData.enfermera as Record<string, unknown>;

    // Si se envía department, buscar el departmentId
    if (
      enfermeraData.department &&
      typeof enfermeraData.department === 'string'
    ) {
      const departmentId = await findDepartmentByName(enfermeraData.department);
      if (!departmentId) {
        throw new Error(
          `Department '${enfermeraData.department}' not found. Please verify the department name.`
        );
      }
      enfermeraData.departmentId = departmentId;
      delete enfermeraData.department;
    }

    dataToUpdate.enfermera = enfermeraData;
  } else if (existingUser.role === 'PACIENTE' && updateData.paciente) {
    dataToUpdate.paciente = updateData.paciente;
  } else if (
    existingUser.role === 'ADMINISTRADOR' &&
    updateData.administrador
  ) {
    dataToUpdate.administrador = updateData.administrador;
  }

  if (status) dataToUpdate.status = status;
  if (date_of_birth) dataToUpdate.date_of_birth = date_of_birth;
  if (age) dataToUpdate.age = age;

  return await prisma.users.update({
    where: { id },
    data: dataToUpdate,
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
  documentNumber: string;
  current_password: string;
  date_of_birth: string | Date;
  role: Role;
  gender?: string;
  phone?: string;
  medico?: { specialty: string; license_number: string };
  enfermera?: { department: string };
  paciente?: { gender: string; address?: string };
  administrador?: { nivelAcceso?: string; departamentoAsignado?: string };
  [key: string]: unknown;
}) => {
  // Verificar si el usuario ya existe por email
  const userExists = await checkUserExists(userData.email);
  if (userExists) {
    throw new Error('User already exists');
  }

  // Verificar si el documento ya existe
  const documentExists = await checkDocumentExists(userData.documentNumber);
  if (documentExists) {
    throw new Error('Document number already exists');
  }

  // Validar y buscar especialidad si es médico
  let specialtyId: string | null = null;
  if (userData.role === 'MEDICO' && userData.medico?.specialty) {
    specialtyId = await findSpecialtyByName(userData.medico.specialty);
    if (!specialtyId) {
      throw new Error(
        `Specialty '${userData.medico.specialty}' not found. Please verify the specialty name.`
      );
    }
  }

  // Validar y buscar departamento si es enfermera
  let departmentId: string | null = null;
  if (userData.role === 'ENFERMERA' && userData.enfermera?.department) {
    departmentId = await findDepartmentByName(userData.enfermera.department);
    if (!departmentId) {
      throw new Error(
        `Department '${userData.enfermera.department}' not found. Please verify the department name.`
      );
    }
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

  // Preparar datos para creación
  const createData: {
    email: string;
    fullname: string;
    documentNumber: string;
    current_password: string;
    date_of_birth: Date;
    age: number;
    role: Role;
    gender?: string;
    phone?: string;
    verificationCode: string;
    verificationCodeExpires: Date;
    medico?: { especialtyId: string; license_number: string };
    enfermera?: { departmentId: string };
    paciente?: { gender: string; address?: string };
    administrador?: { nivelAcceso?: string; departamentoAsignado?: string };
  } = {
    email: userData.email,
    fullname: userData.fullname,
    documentNumber: userData.documentNumber,
    current_password: hashedPassword,
    date_of_birth: new Date(userData.date_of_birth),
    age,
    role: userData.role,
    verificationCode,
    verificationCodeExpires,
  };

  if (userData.gender) createData.gender = userData.gender;
  if (userData.phone) createData.phone = userData.phone;

  // Añadir campos embebidos según el rol
  if (userData.role === 'MEDICO' && userData.medico && specialtyId) {
    createData.medico = {
      especialtyId: specialtyId,
      license_number: userData.medico.license_number,
    };
  } else if (
    userData.role === 'ENFERMERA' &&
    userData.enfermera &&
    departmentId
  ) {
    createData.enfermera = {
      departmentId: departmentId,
    };
  } else if (userData.role === 'PACIENTE' && userData.paciente) {
    createData.paciente = userData.paciente;
  } else if (userData.role === 'ADMINISTRADOR' && userData.administrador) {
    createData.administrador = userData.administrador;
  }

  // Crear usuario en la base de datos
  const newUser = await prisma.users.create({
    data: createData,
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
    documentNumber: newUser.documentNumber,
    status: newUser.status,
    role: newUser.role,
  };
};

export default {
  checkUserExists,
  checkDocumentExists,
  getAllUsers,
  searchPatientsAdvanced,
  getUserById,
  getPatientById,
  updateUser,
  deactivateUser,
  getUserStats,
  createUser,
};
