import { PrismaClient } from '@prisma/client';
import { normalizeString } from '../utils/normalizeString.js';

const prisma = new PrismaClient();

/**
 * Busca una especialidad por nombre (normalizado)
 * @param specialtyName - Nombre de la especialidad
 * @returns El ID de la especialidad si existe, null si no
 */
export const findSpecialtyByName = async (
  specialtyName: string
): Promise<string | null> => {
  const normalizedSearch = normalizeString(specialtyName);

  // Obtener todas las especialidades y buscar por nombre normalizado
  const specialties = await prisma.especialty.findMany({
    select: { id: true, name: true },
  });

  const foundSpecialty = specialties.find(
    spec => normalizeString(spec.name) === normalizedSearch
  );

  return foundSpecialty ? foundSpecialty.id : null;
};

/**
 * Busca un departamento por nombre (normalizado)
 * @param departmentName - Nombre del departamento
 * @returns El ID del departamento si existe, null si no
 */
export const findDepartmentByName = async (
  departmentName: string
): Promise<string | null> => {
  const normalizedSearch = normalizeString(departmentName);

  // Obtener todos los departamentos y buscar por nombre normalizado
  const departments = await prisma.department.findMany({
    select: { id: true, name: true },
  });

  const foundDepartment = departments.find(
    dept => normalizeString(dept.name) === normalizedSearch
  );

  return foundDepartment ? foundDepartment.id : null;
};
