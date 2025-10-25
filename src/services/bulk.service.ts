import { PrismaClient, type Users } from '@prisma/client';
import bcrypt from 'bcrypt';
import { ZodError } from 'zod';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import emailConfig, {
  generateVerificationCode,
} from '../config/emailConfig.js';
import { parseBuffer } from '../libs/parseFile.js';
import { userSchema, validateAge } from '../schemas/User.js';
import calculateAge from '../libs/calculateAge.js';
import {
  findSpecialtyByName,
  findDepartmentByName,
} from './specialty.service.js';

const prisma = new PrismaClient();

interface BulkImportResult {
  successful: Array<{ index: number; patient: Users }>;
  failed: Array<{
    index: number;
    row: Record<string, unknown>;
    error: string;
  }>;
  total: number;
}

interface BulkServiceResult {
  success: boolean;
  error?: {
    status: number;
    message: string;
  };
  data?: {
    message: string;
    summary: {
      total: number;
      successful: number;
      failed: number;
    };
    results: BulkImportResult;
  };
}

class BulkService {
  async importUsers(file: Express.Multer.File): Promise<BulkServiceResult> {
    try {
      const rows = parseBuffer(file.buffer, file.originalname);

      const results: BulkImportResult = {
        successful: [],
        failed: [],
        total: rows.length,
      };

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        try {
          if (!row) continue;

          // Transformar el row del CSV a la estructura esperada
          const transformedRow = this.transformCsvRow(row);
          const processResult = await this.processUserRow(transformedRow);

          if (processResult.success && processResult.user) {
            results.successful.push({
              index: i,
              patient: processResult.user,
            });
          } else if (processResult.error) {
            results.failed.push({
              index: i,
              row: row ?? {},
              error: processResult.error,
            });
          }
        } catch (err: unknown) {
          const errorMessage = this.handleRowError(err);
          results.failed.push({
            index: i,
            row: row ?? {},
            error: errorMessage,
          });
        }
      }

      return {
        success: true,
        data: {
          message: 'Importación completada',
          summary: {
            total: results.total,
            successful: results.successful.length,
            failed: results.failed.length,
          },
          results,
        },
      };
    } catch (error) {
      console.error('[BulkService.importUsers] unhandled error', error);
      throw error;
    }
  }

  private transformCsvRow(
    row: Record<string, unknown>
  ): Record<string, unknown> {
    const transformed: Record<string, unknown> = {};

    // Copiar campos base
    for (const [key, value] of Object.entries(row)) {
      if (!key.includes('.')) {
        transformed[key] = value;
      }
    }

    // Transformar campos anidados para médico
    if (row['medico.specialty'] || row['medico.license_number']) {
      transformed.medico = {
        specialty: row['medico.specialty'] || '',
        license_number: row['medico.license_number'] || '',
      };
    }

    // Transformar campos anidados para enfermera
    if (row['enfermera.department']) {
      transformed.enfermera = {
        department: row['enfermera.department'] || '',
      };
    }

    // Transformar campos anidados para paciente
    if (row['paciente.gender'] || row['paciente.address']) {
      transformed.paciente = {
        gender: row['paciente.gender'] || '',
        address: row['paciente.address'] || '',
      };
    }

    // Transformar campos anidados para administrador
    if (
      row['administrador.nivelAcceso'] ||
      row['administrador.departamentoAsignado']
    ) {
      transformed.administrador = {
        nivelAcceso: row['administrador.nivelAcceso'] || '',
        departamentoAsignado: row['administrador.departamentoAsignado'] || '',
      };
    }

    return transformed;
  }

  private async processUserRow(row: Record<string, unknown>): Promise<{
    success: boolean;
    user?: Users;
    error?: string;
  }> {
    try {
      // Validar y parsear datos del usuario
      const data = userSchema.parse(row);

      // Calcular edad (convertir Date a string ISO si es necesario)
      const dateOfBirth =
        typeof data.date_of_birth === 'string'
          ? data.date_of_birth
          : data.date_of_birth.toISOString();
      const age = calculateAge(dateOfBirth);
      validateAge.parse(age);

      // Generar código de verificación
      const verificationCode = generateVerificationCode();
      const verificationCodeExpires = new Date();
      verificationCodeExpires.setHours(verificationCodeExpires.getHours() + 24);

      // Preparar datos base
      const userData: Record<string, unknown> = {
        email: data.email,
        current_password: await bcrypt.hash(data.current_password, 10),
        fullname: data.fullname,
        documentNumber: data.documentNumber,
        role: data.role,
        date_of_birth: new Date(data.date_of_birth),
        age,
        phone: data.phone,
        gender: data.gender,
        status: data.status,
        verificationCode,
        verificationCodeExpires,
      };

      // Manejar campos específicos según el rol
      if (data.role === 'MEDICO' && 'medico' in data && data.medico) {
        // Buscar especialidad por nombre
        const specialtyId = await findSpecialtyByName(data.medico.specialty);
        if (!specialtyId) {
          return {
            success: false,
            error: `Especialidad "${data.medico.specialty}" no encontrada. Cree la especialidad primero.`,
          };
        }
        userData.medico = {
          especialtyId: specialtyId,
          license_number: data.medico.license_number,
        };
      } else if (
        data.role === 'ENFERMERA' &&
        'enfermera' in data &&
        data.enfermera
      ) {
        // Buscar departamento por nombre
        const departmentId = await findDepartmentByName(
          data.enfermera.department
        );
        if (!departmentId) {
          return {
            success: false,
            error: `Departamento "${data.enfermera.department}" no encontrado. Cree el departamento primero.`,
          };
        }
        userData.enfermera = {
          departmentId: departmentId,
        };
      } else if (data.role === 'PACIENTE') {
        // Para pacientes, el campo paciente es opcional pero gender es requerido
        if ('paciente' in data && data.paciente) {
          userData.paciente = data.paciente;
        }
      } else if (data.role === 'ADMINISTRADOR') {
        // Para administradores, los datos son opcionales
        if ('administrador' in data && data.administrador) {
          userData.administrador = data.administrador;
        }
      }

      // Crear usuario en la base de datos
      const user = await prisma.users.create({
        data: userData as never,
      });

      // Intentar enviar email de verificación
      const emailSent = await this.sendVerificationEmail(
        user,
        verificationCode
      );

      if (!emailSent) {
        // Si falla el envío del email, eliminar el usuario creado
        await prisma.users.delete({
          where: { id: user.id },
        });
        return {
          success: false,
          error: 'Error al enviar email de verificación',
        };
      }

      return {
        success: true,
        user,
      };
    } catch (err: unknown) {
      return {
        success: false,
        error: this.handleRowError(err),
      };
    }
  }

  private async sendVerificationEmail(
    user: Users,
    verificationCode: string
  ): Promise<boolean> {
    try {
      await emailConfig.sendVerificationEmail?.(
        user.email,
        user.fullname,
        verificationCode
      );
      return true;
    } catch (error) {
      console.warn(
        '[BulkService] Could not send verification email for user:',
        user.email,
        error
      );
      return false;
    }
  }

  private handleRowError(err: unknown): string {
    // Manejo de errores de validación Zod
    if (err instanceof ZodError) {
      const flattened = err.flatten();
      const fieldErrors = Object.values(flattened.fieldErrors).flat();
      const allErrors = [...flattened.formErrors, ...fieldErrors].filter(Boolean);
      return allErrors.join('; ') || 'Error de validación';
    }

    // Manejo de errores de Prisma (p. ej. P2002: unique constraint)
    if (err instanceof PrismaClientKnownRequestError) {
      if (err.code === 'P2002') {
        // err.meta?.target normalmente contiene el campo único
        const metaObj = err.meta as unknown as { target?: unknown } | undefined;
        const target = metaObj?.target;
        const targetStr = Array.isArray(target) ? target.join(', ') : String(target ?? 'campo único');
        return `Conflicto de clave única (${targetStr})`;
      }
      return `Error de base de datos (${err.code})`;
    }

    return err instanceof Error ? err.message : String(err);
  }
}

export default new BulkService();
