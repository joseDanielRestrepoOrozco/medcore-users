import { PrismaClient, type Users } from '@prisma/client';
import bcrypt from 'bcrypt';
import z from 'zod';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import emailConfig, {
  generateVerificationCode,
} from '../config/emailConfig.js';
import { parseBuffer } from '../libs/parseFile.js';
import { userSchema, validateAge } from '../schemas/User.js';
import calculateAge from '../libs/calculateAge.js';

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

          const processResult = await this.processUserRow(row);

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

  private async processUserRow(row: Record<string, unknown>): Promise<{
    success: boolean;
    user?: Users;
    error?: string;
  }> {
    try {
      // Validar y parsear datos del usuario
      const data = userSchema.parse(row);

      // Calcular edad (convertir Date a string ISO si es necesario)
      const dateOfBirth = typeof data.date_of_birth === 'string' 
        ? data.date_of_birth 
        : data.date_of_birth.toISOString();
      const age = calculateAge(dateOfBirth);
      validateAge.parse(age);

      // Generar código de verificación
      const verificationCode = generateVerificationCode();
      const verificationCodeExpires = new Date();
      verificationCodeExpires.setHours(verificationCodeExpires.getHours() + 24);

      // Crear usuario en la base de datos
      const user = await prisma.users.create({
        data: {
          ...data,
          current_password: await bcrypt.hash(data.current_password, 10),
          age,
          date_of_birth: new Date(data.date_of_birth),
          verificationCode,
          verificationCodeExpires,
        },
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
    if (err instanceof z.ZodError) {
      const flattened = z.flattenError(err);
      const allErrors = [
        ...flattened.formErrors,
        ...Object.values(flattened.fieldErrors).flat(),
      ];
      return allErrors.join('; ');
    }

    if (err instanceof PrismaClientKnownRequestError && err.code === 'P2002') {
      return 'Conflicto de clave única (email ya existe)';
    }

    return err instanceof Error ? err.message : String(err);
  }
}

export default new BulkService();
