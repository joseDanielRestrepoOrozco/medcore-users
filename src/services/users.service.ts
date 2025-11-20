import { PrismaClient, Prisma } from '@prisma/client';
type Role = Prisma.Role;
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
 * Obtiene todos los usuarios con filtros y paginación
 */
export const getAllUsers = async (filters: {
  page: number;
  limit: number;
  q?: string; // Parámetro de búsqueda por fullname o documentNumber
  status?: UserStatus;
  role?: Role;
<<<<<<< HEAD
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
    whereClause.specialization = { contains: specialization, mode: 'insensitive' };
  }

  if (q && q.trim().length > 0) {
    const term = q.trim();
    whereClause.OR = [
      { fullname: { contains: term, mode: 'insensitive' } },
      { email: { contains: term, mode: 'insensitive' } },
      { license_number: { contains: term, mode: 'insensitive' } },
      { department: { contains: term, mode: 'insensitive' } },
    ];
=======
  specialtyId?: string;
  gender?: string;
}) => {
  const { page, limit, q, status, role, specialtyId, gender } = filters;
  const skip = (page - 1) * limit;

  // Construcción dinámica del whereClause
  const whereClause: Record<string, unknown> = {};

  if (status) whereClause.status = status;
  if (role) whereClause.role = role;
  if (gender) whereClause.gender = gender;

  // Búsqueda por fullname o documentNumber
  if (q) {
    whereClause.OR = [
      {
        fullname: {
          contains: q,
          mode: 'insensitive',
        },
      },
      {
        documentNumber: {
          contains: q,
          mode: 'insensitive',
        },
      },
    ];
  }

  // Filtro de especialidad para médicos usando equals
  if (specialtyId && role === 'MEDICO') {
    whereClause.medico = {
      is: {
        specialtyId: specialtyId,
      },
    };
>>>>>>> dev
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
 * Actualiza un usuario por ID siguiendo las mejores prácticas de Prisma
 * - Campos primitivos/enums: actualización directa de solo los campos enviados
 * - Tipos compuestos opcionales: merge manual + upsert para preservar datos no enviados
 */
export const updateUser = async (
  id: string,
  updateData: Record<string, unknown>,
  role?: Role
) => {
<<<<<<< HEAD
  const existingUser = await prisma.users.findUnique({
    where: { id },
    select: { id: true, role: true },
=======
  const whereClause: { id: string; role?: Role } = { id };
  if (role) whereClause.role = role;

  // 1. Obtener el usuario actual con todos sus datos
  const existingUser = await prisma.users.findFirst({
    where: whereClause,
>>>>>>> dev
  });

  if (!existingUser) {
    return null;
  }

<<<<<<< HEAD
  let status: 'ACTIVE' | 'PENDING' | 'INACTIVE' | undefined;
  if (typeof updateData.status === 'string') {
    const s = updateData.status.toUpperCase();
    if (s === 'ACTIVE' || s === 'PENDING' || s === 'INACTIVE') status = s;
=======
  // 2. Preparar campos primitivos y enums para actualización directa
  const primitiveFields: Record<string, unknown> = {};

  // Procesar status
  if (updateData.status) {
    switch (updateData.status) {
      case 'ACTIVE':
        primitiveFields.status = UserStatus.ACTIVE;
        break;
      case 'PENDING':
        primitiveFields.status = UserStatus.PENDING;
        break;
      case 'INACTIVE':
        primitiveFields.status = UserStatus.INACTIVE;
        break;
    }
>>>>>>> dev
  }

  // Procesar date_of_birth y age
  if (updateData.date_of_birth) {
    const date_of_birth = new Date(updateData.date_of_birth as string);
    const age = calculateAge(date_of_birth.toISOString());
    validateAge.parse(age);
    primitiveFields.date_of_birth = date_of_birth;
    primitiveFields.age = age;
  }

<<<<<<< HEAD
  return await prisma.users.update({
    where: { id },
    data: {
      email: (updateData.email as string) || undefined,
      fullname: (updateData.fullname as string) || undefined,
      phone: (updateData.phone as string) || undefined,
      status,
      date_of_birth,
      age,
    },
=======
  // Agregar otros campos primitivos si existen
  const primitiveFieldNames = [
    'email',
    'fullname',
    'documentNumber',
    'phone',
    'gender',
  ];
  for (const field of primitiveFieldNames) {
    if (updateData[field] !== undefined) {
      primitiveFields[field] = updateData[field];
    }
  }

  // 3. Procesar tipos compuestos según el rol (merge manual + upsert)
  const compositeFields: Record<string, unknown> = {};

  if (existingUser.role === 'MEDICO' && updateData.medico) {
    const medicoInput = updateData.medico as Record<string, unknown>;

    // Si se envía specialty por nombre, buscar el specialtyId
    if (medicoInput.specialty && typeof medicoInput.specialty === 'string') {
      const specialtyId = await findSpecialtyByName(medicoInput.specialty);
      if (!specialtyId) {
        throw new Error(
          `Specialty '${medicoInput.specialty}' not found. Please verify the specialty name.`
        );
      }
      medicoInput.specialtyId = specialtyId;
      delete medicoInput.specialty;
    }

    // Merge manual: combinar datos actuales con los nuevos
    const mergedMedico = {
      ...existingUser.medico, // datos actuales
      ...medicoInput, // solo los campos enviados sobrescriben
    };

    // Usar upsert para actualización segura del tipo compuesto
    compositeFields.medico = {
      upsert: {
        set: mergedMedico,
        update: mergedMedico,
      },
    };
  } else if (existingUser.role === 'ENFERMERA' && updateData.enfermera) {
    const enfermeraInput = updateData.enfermera as Record<string, unknown>;

    // Si se envía department por nombre, buscar el departmentId
    if (
      enfermeraInput.department &&
      typeof enfermeraInput.department === 'string'
    ) {
      const departmentId = await findDepartmentByName(
        enfermeraInput.department
      );
      if (!departmentId) {
        throw new Error(
          `Department '${enfermeraInput.department}' not found. Please verify the department name.`
        );
      }
      enfermeraInput.departmentId = departmentId;
      delete enfermeraInput.department;
    }

    // Merge manual: combinar datos actuales con los nuevos
    const mergedEnfermera = {
      ...existingUser.enfermera, // datos actuales
      ...enfermeraInput, // solo los campos enviados sobrescriben
    };

    // Usar upsert para actualización segura del tipo compuesto
    compositeFields.enfermera = {
      upsert: {
        set: mergedEnfermera,
        update: mergedEnfermera,
      },
    };
  } else if (existingUser.role === 'PACIENTE' && updateData.paciente) {
    const pacienteInput = updateData.paciente as Record<string, unknown>;

    // Merge manual: combinar datos actuales con los nuevos
    const mergedPaciente = {
      ...existingUser.paciente, // datos actuales
      ...pacienteInput, // solo los campos enviados sobrescriben
    };

    // Usar upsert para actualización segura del tipo compuesto
    compositeFields.paciente = {
      upsert: {
        set: mergedPaciente,
        update: mergedPaciente,
      },
    };
  }
  // Nota: ADMINISTRADOR no tiene datos embebidos en el schema actual

  // 4. Combinar todos los campos para la actualización
  const dataToUpdate = {
    ...primitiveFields,
    ...compositeFields,
  };

  // 5. Ejecutar la actualización con control fino
  return await prisma.users.update({
    where: { id },
    data: dataToUpdate,
>>>>>>> dev
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
  medico?: { specialtyId: string; license_number: string };
  enfermera?: { departmentId: string };
  paciente?: { address?: string };
}) => {
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
    documentNumber: newUser.documentNumber,
    status: newUser.status,
    role: newUser.role,
  };
};

export default {
  getAllUsers,
  searchPatientsAdvanced,
  getUserById,
  getPatientById,
  updateUser,
  deactivateUser,
  getUserStats,
  createUser,
};
