import { z } from 'zod';

// Schema para filtros de búsqueda
export const getUsersFiltersSchema = z.object({
  role: z.enum(['MEDICO', 'ENFERMERA', 'PACIENTE', 'ADMINISTRADOR']).optional(),
  status: z.enum(['PENDING', 'ACTIVE', 'INACTIVE']).optional(),
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(10),
});

const nameRegex = /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/;

const current_password = z
  .string()
  .min(6, { message: 'Debe tener al menos 6 caracteres' })
  .refine(val => /\d/.test(val), {
    message: 'Debe contener al menos un número',
  });

const roleEnumSchema = z.enum([
  'MEDICO',
  'ENFERMERA',
  'PACIENTE',
  'ADMINISTRADOR',
]);

const baseUser = z.object({
  email: z.email(),
  current_password,
  fullname: z.string().min(1).regex(nameRegex, { message: 'Nombre inválido' }),
  phone: z.string().optional(),
  date_of_birth: z.iso.date(),
  gender: z.string().optional(),
  status: z.enum(['PENDING', 'ACTIVE', 'INACTIVE']).default('PENDING'),
});

export const validateAge = z.number().min(1).max(100);

export const medicoSchema = baseUser.extend({
  role: z.literal(roleEnumSchema.enum.MEDICO),
  specialization: z.string(),
  department: z.string(),
  license_number: z.string(),
});

export const enfermeraSchema = baseUser.extend({
  role: z.literal(roleEnumSchema.enum.ENFERMERA),
  department: z.string(),
});

export const pacienteSchema = baseUser.extend({
  role: z.literal(roleEnumSchema.enum.PACIENTE),
});

export const administradorSchema = baseUser.extend({
  role: z.literal(roleEnumSchema.enum.ADMINISTRADOR),
});

export const userSchema = z.discriminatedUnion('role', [
  medicoSchema,
  enfermeraSchema,
  pacienteSchema,
  administradorSchema,
]);

export const medicoUpdateSchema = medicoSchema.partial();
export const enfermeraUpdateSchema = enfermeraSchema.partial();
export const pacienteUpdateSchema = pacienteSchema.partial();
export const administradorUpdateSchema = administradorSchema.partial();

export const usersUpdateSchema = z.discriminatedUnion('role', [
  medicoUpdateSchema,
  enfermeraUpdateSchema,
  pacienteUpdateSchema,
  administradorUpdateSchema,
]);

export type User = z.infer<typeof userSchema>;

// parsear el rol y por defecto 'PACIENTE' si no está presente
export const roleSchema = z
  .enum(['MEDICO', 'ENFERMERA', 'PACIENTE', 'ADMINISTRADOR'])
  .default('PACIENTE');

