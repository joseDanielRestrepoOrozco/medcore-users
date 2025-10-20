import { z } from 'zod';

// Schema para actualizar usuario
export const updateUserSchema = z.object({
  fullname: z.string().min(3).max(100).optional(),
  phone: z.string().min(10).max(20).optional(),
  specialization: z.string().max(100).optional(),
  department: z.string().max(100).optional(),
  license_number: z.string().max(50).optional(),
  role: z.enum(['MEDICO', 'ENFERMERA', 'PACIENTE', 'ADMINISTRADOR']).optional(),
  status: z.enum(['PENDING', 'ACTIVE', 'INACTIVE']).optional(),
});

// Schema para filtros de búsqueda
export const getUsersFiltersSchema = z.object({
  role: z.enum(['MEDICO', 'ENFERMERA', 'PACIENTE', 'ADMINISTRADOR']).optional(),
  status: z.enum(['PENDING', 'ACTIVE', 'INACTIVE']).optional(),
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(10),
});

export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type GetUsersFilters = z.infer<typeof getUsersFiltersSchema>;
