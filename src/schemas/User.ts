import { z } from 'zod';

// ============================================
// SCHEMAS DE FILTROS Y PAGINACIÓN
// ============================================

// Schema para filtros de búsqueda generales (todos los campos opcionales)
export const getUsersFiltersSchema = z.object({
  status: z.enum(['PENDING', 'ACTIVE', 'INACTIVE']).optional(),
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(10),
});

// Schema para filtros cuando el role es requerido (como en getUsersByRole)
export const getUsersByRoleFiltersSchema = z.object({
  role: z.enum(['MEDICO', 'ENFERMERA', 'PACIENTE', 'ADMINISTRADOR']),
  status: z.enum(['PENDING', 'ACTIVE', 'INACTIVE']).optional(),
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(10),
});

// Schema para filtros de doctores (specialty es opcional)
export const getDoctorsFiltersSchema = z.object({
  status: z.enum(['PENDING', 'ACTIVE', 'INACTIVE']).optional(),
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(10),
});

export const getSpecialtyFiltersSchema = z.object({
  status: z.enum(['PENDING', 'ACTIVE', 'INACTIVE']).optional(),
  especialtyId: z.string().optional(),
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(10),
});

// Schema para búsqueda avanzada de pacientes (migrado de patients)
export const advancedSearchSchema = z.object({
  documentNumber: z.string().optional(),
  gender: z.string().optional(),
  address: z.string().optional(),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(10),
});

// ============================================
// VALIDACIONES COMUNES
// ============================================

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

export const validateAge = z.number().min(1).max(120);

// ============================================
// SCHEMAS DE TIPOS COMPUESTOS (EMBEBIDOS)
// ============================================

// Datos específicos de Médicos - Para creación (acepta nombre o ID de especialidad)
export const datosMedicoSchema = z
  .object({
    specialty: z.string().optional(),
    specialtyId: z.string().optional(),
    license_number: z.string(),
  })
  .refine(
    data => {
      // Al menos uno de los dos debe estar presente
      return data.specialty || data.specialtyId;
    },
    { message: 'Debe proporcionar specialty (nombre) o specialtyId' }
  );

// Datos específicos de Médicos - Para actualización (acepta specialtyId)
export const datosMedicoUpdateSchema = z
  .object({
    specialtyId: z.string().optional(),
    specialty: z.string().optional(),
    license_number: z.string().optional(),
  })
  .refine(
    data => {
      // Al menos uno de los dos debe estar presente si se envía el objeto
      if (data.specialtyId || data.specialty) return true;
      return false;
    },
    { message: 'Debe proporcionar specialty o specialtyId' }
  );

// Datos específicos de Enfermeras - Para creación (acepta nombre o ID de departamento)
export const datosEnfermeraSchema = z
  .object({
    department: z.string().optional(),
    departmentId: z.string().optional(),
  })
  .refine(
    data => {
      // Al menos uno de los dos debe estar presente
      return data.department || data.departmentId;
    },
    { message: 'Debe proporcionar department (nombre) o departmentId' }
  );

// Datos específicos de Enfermeras - Para actualización (acepta departmentId)
export const datosEnfermeraUpdateSchema = z
  .object({
    departmentId: z.string().optional(),
    department: z.string().optional(),
  })
  .refine(
    data => {
      // Al menos uno de los dos debe estar presente si se envía el objeto
      if (data.departmentId || data.department) return true;
      return false;
    },
    { message: 'Debe proporcionar department o departmentId' }
  );

// Datos específicos de Pacientes
export const datosPacienteSchema = z.object({
  gender: z.string(),
  address: z.string().optional(),
});

// Datos específicos de Administradores
export const datosAdministradorSchema = z.object({
  nivelAcceso: z.string().optional(),
  departamentoAsignado: z.string().optional(),
});

// ============================================
// SCHEMAS DE USUARIO BASE
// ============================================

const baseUser = z.object({
  email: z.email(),
  current_password,
  fullname: z.string().min(1).regex(nameRegex, { message: 'Nombre inválido' }),
  documentNumber: z
    .string()
    .min(1, { message: 'Número de documento requerido' }),
  phone: z.string().optional(),
  gender: z.string().optional(),
  date_of_birth: z.coerce.date(),
  status: z.enum(['PENDING', 'ACTIVE', 'INACTIVE']).default('PENDING'),
});

// ============================================
// SCHEMAS POR ROL (CREACIÓN)
// ============================================

export const medicoSchema = baseUser.extend({
  role: z.literal(roleEnumSchema.enum.MEDICO),
  medico: datosMedicoSchema,
});

export const enfermeraSchema = baseUser.extend({
  role: z.literal(roleEnumSchema.enum.ENFERMERA),
  enfermera: datosEnfermeraSchema,
});

export const pacienteSchema = baseUser.extend({
  role: z.literal(roleEnumSchema.enum.PACIENTE),
  gender: z.string(), // Campo base requerido para pacientes
  paciente: datosPacienteSchema.optional(),
});

export const administradorSchema = baseUser.extend({
  role: z.literal(roleEnumSchema.enum.ADMINISTRADOR),
  administrador: datosAdministradorSchema.optional(),
});

export const userSchema = z.discriminatedUnion('role', [
  medicoSchema,
  enfermeraSchema,
  pacienteSchema,
  administradorSchema,
]);

// ============================================
// SCHEMAS DE ACTUALIZACIÓN
// ============================================

export const medicoUpdateSchema = baseUser
  .extend({
    role: z.literal(roleEnumSchema.enum.MEDICO),
    medico: datosMedicoUpdateSchema.optional(),
  })
  .omit({ status: true, current_password: true })
  .partial();

export const enfermeraUpdateSchema = baseUser
  .extend({
    role: z.literal(roleEnumSchema.enum.ENFERMERA),
    enfermera: datosEnfermeraUpdateSchema.optional(),
  })
  .omit({ status: true, current_password: true })
  .partial();

export const pacienteUpdateSchema = pacienteSchema
  .omit({ status: true, current_password: true })
  .partial();

export const administradorUpdateSchema = administradorSchema
  .omit({ status: true, current_password: true })
  .partial();

// ============================================
// SCHEMAS AUXILIARES
// ============================================

export type User = z.infer<typeof userSchema>;

// parsear el rol y por defecto 'PACIENTE' si no está presente
export const roleSchema = z
  .enum(['MEDICO', 'ENFERMERA', 'PACIENTE', 'ADMINISTRADOR'])
  .default('PACIENTE');

export type Role = z.infer<typeof roleSchema>;

export const verifyIdSchema = z.string();

export const statusSchema = z.object({
  status: z.enum(['PENDING', 'ACTIVE', 'INACTIVE']),
});
