import { type NextFunction, type Request, type Response } from 'express';
import { PrismaClient, type Users } from '@prisma/client';
import emailConfig, { generateVerificationCode } from '../config/emailConfig';
import { parseBuffer } from '../libs/parseFile';
import z from 'zod';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { userSchema, validateAge } from '../schemas/User';
import calculateAge from '../libs/calculateAge';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function bulkImportPatients(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const file = req.file as Express.Multer.File | undefined;
    if (!file) {
      res.status(400).json({ error: 'Archivo requerido' });
      return;
    }

    const rows = parseBuffer(file.buffer, file.originalname);

    const results = {
      successful: [] as Array<{ index: number; patient: Users }>,
      failed: [] as Array<{
        index: number;
        row: Record<string, unknown>;
        error: string;
      }>,
      total: rows.length,
    };

    for (let i = 0; i < rows.length; i++) {
  const row = rows[i];
      try {
        if (!row) continue;

        const data = userSchema.parse(row);

        // calcular dob y edad
        const age = calculateAge(data.date_of_birth);

        validateAge.parse(age);

        const verificationCode = generateVerificationCode();
        const verificationCodeExpires = new Date();
        verificationCodeExpires.setHours(
          verificationCodeExpires.getHours() + 24
        );

        const patient = await prisma.users.create({
          data: {
            ...data,
            current_password: await bcrypt.hash(data.current_password, 10),
            age,
            date_of_birth: new Date(data.date_of_birth),
            verificationCode,
            verificationCodeExpires,
          },
        });

        try {
          await emailConfig.sendVerificationEmail?.(
            patient.email,
            `${patient.fullname}`,
            verificationCode
          );
        } catch (e) {
          await prisma.users.delete({
            where: { id: patient.id },
          });
          console.warn('Could not send verification email for bulk patient', e);
        }

        results.successful.push({ index: i, patient });
      } catch (err: unknown) {
        const safeRow = row ?? {};
        if (err instanceof z.ZodError) {
          const flattened = z.flattenError(err);
          const allErrors = [
            ...flattened.formErrors,
            ...Object.values(flattened.fieldErrors).flat(),
          ];
          results.failed.push({
            index: i,
            row: safeRow,
            error: allErrors.join('; '),
          });
        } else if (
          err instanceof PrismaClientKnownRequestError &&
          err.code === 'P2002'
        ) {
          results.failed.push({
            index: i,
            row: safeRow,
            error: 'Conflicto de clave única',
          });
        } else {
          const message = err instanceof Error ? err.message : String(err);
          results.failed.push({ index: i, row: safeRow, error: message });
        }
      }
    }

    res.status(200).json({
      message: 'Importación completada',
      summary: {
        total: results.total,
        successful: results.successful.length,
        failed: results.failed.length,
      },
      results,
    });
  } catch (error: unknown) {
    next(error);
  }
}

export default { bulkImportPatients };
