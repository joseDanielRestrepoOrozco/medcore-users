import { type NextFunction, type Request, type Response } from 'express';
import { PrismaClient, type Users } from '@prisma/client';
import emailConfig, { generateVerificationCode } from '../config/emailConfig.js';
import { parseBuffer } from '../libs/parseFile.js';
import z from 'zod';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { userSchema, validateAge } from '../schemas/User.js';
import calculateAge from '../libs/calculateAge.js';
import bcrypt from 'bcrypt';
import { PATIENTS_SERVICE_URL } from '../libs/config.js';

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
    // ALERT: inicio de procesamiento
    console.warn('[ALERT][BULK_USERS] start', {
      name: file.originalname,
      type: file.mimetype,
      size: file.size,
    });

    const rows = parseBuffer(file.buffer, file.originalname);
    const firstRow = rows[0] || {};
    console.warn('[ALERT][BULK_USERS] parsed', {
      rows: rows.length,
      headers: Object.keys(firstRow),
    });

    const results = {
      successful: [] as Array<{ index: number; patient: Users }>,
      failed: [] as Array<{
        index: number;
        row: Record<string, unknown>;
        error: string;
      }>,
      total: rows.length,
    };
    const patientRows: Array<{ idx: number; row: Record<string, unknown> }> = [];
    // Control de duplicados dentro del mismo archivo (case-insensitive)
    const seen = new Set<string>();

    const normalize = (row: Record<string, unknown>) => {
      const out: Record<string, unknown> = {};
      // normaliza claves comunes y alias
      const remap: Record<string, string> = {
        currentPassword: 'current_password',
        password: 'current_password',
        dateOfBirth: 'date_of_birth',
        birthDate: 'date_of_birth',
        fecha_nacimiento: 'date_of_birth',
        telefono: 'phone',
        licencia: 'license_number',
        licencia_medica: 'license_number',
        especialidad: 'specialization',
        departamento: 'department',
      };
      Object.entries(row).forEach(([k, v]) => {
        const key = remap[k] ?? k.trim();
        out[key] = typeof v === 'string' ? v.trim() : v;
      });
      // role/status en mayúsculas y aceptar variantes en español/inglés
      const role = String(out.role || '').toUpperCase();
      const roleMap: Record<string, string> = {
        DOCTOR: 'MEDICO',
        MÉDICO: 'MEDICO',
        MEDICO: 'MEDICO',
        NURSE: 'ENFERMERA',
        ENFERMERA: 'ENFERMERA',
        PATIENT: 'PACIENTE',
        PACIENTE: 'PACIENTE',
        ADMIN: 'ADMINISTRADOR',
        ADMINISTRADOR: 'ADMINISTRADOR',
      };
      if (role) out.role = roleMap[role] ?? role;

      const status = String(out.status || '').toUpperCase();
      const statusMap: Record<string, string> = {
        ACTIVO: 'ACTIVE',
        INACTIVO: 'INACTIVE',
        PENDIENTE: 'PENDING',
        ACTIVE: 'ACTIVE',
        INACTIVE: 'INACTIVE',
        PENDING: 'PENDING',
      };
      if (status) out.status = statusMap[status] ?? status;

      return out;
    };

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      try {
        if (!row) continue;
        // omitir filas completamente vacías (p. ej., líneas en blanco del CSV)
        const allEmpty = Object.values(row as Record<string, unknown>)
          .map((v) => (typeof v === 'string' ? v.trim() : v))
          .every((v) => v === '' || v === null || v === undefined);
        if (allEmpty) continue;
        const norm = normalize(row as Record<string, unknown>);
        const emailNorm = String(norm.email || '').trim().toLowerCase();
        if (!emailNorm) {
          results.failed.push({ index: i, row, error: 'Email requerido' });
          continue;
        }
        if (seen.has(emailNorm)) {
          results.failed.push({ index: i, row, error: 'Duplicado en archivo (email repetido)' });
          continue;
        }
        seen.add(emailNorm);
        const data = userSchema.parse(norm);

        // Desviar pacientes al servicio de pacientes
        if (String(data.role).toUpperCase() === 'PACIENTE') {
          patientRows.push({ idx: i, row: norm });
          continue;
        }

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
          console.warn('[ALERT][BULK_USERS] email send failed - user reverted', { email: patient.email });
        }

        results.successful.push({ index: i, patient });
        // No spam logs en éxito por fila
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
          console.warn('[ALERT][BULK_USERS] row failed (zod)', { index: i, error: allErrors.join('; ') });
        } else if (
          err instanceof PrismaClientKnownRequestError &&
          err.code === 'P2002'
        ) {
          results.failed.push({
            index: i,
            row: safeRow,
            error: 'Email ya registrado',
          });
          console.warn('[ALERT][BULK_USERS] row failed (unique)', { index: i });
        } else {
          const message = err instanceof Error ? err.message : String(err);
          results.failed.push({ index: i, row: safeRow, error: message });
          console.warn('[ALERT][BULK_USERS] row failed (error)', { index: i, error: message });
        }
      }
    }
    // Si hay pacientes, enviarlos en un solo POST al servicio de pacientes
    let patientOk = 0;
    let patientFail = 0;
    if (patientRows.length) {
      try {
        const mapped = patientRows.map(({ row }) => {
          const fullname = String(row.fullname || '')
            .replace(/\s+/g, ' ')
            .trim();
        const parts = fullname.split(' ');
          const firstName = parts.slice(0, -1).join(' ') || fullname;
          const lastName = parts.slice(-1).join(' ') || '';
          return {
            firstName,
            lastName,
            email: row.email,
            phone: row.phone,
            birthDate: row.date_of_birth || row.dateOfBirth || row.birthDate,
            genero: row.gender || row.genero,
          } as Record<string, unknown>;
        });
        const resp = await fetch(`${PATIENTS_SERVICE_URL}/api/v1/patients/bulk-import`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ patients: mapped }),
        });
        const data = await resp.json().catch(() => ({}));
        const ok = Number(data?.summary?.successful || 0);
        const fail = Number(data?.summary?.failed || 0);
        patientOk = ok;
        patientFail = fail;
        // Ajustar totales; no agregamos detalle de filas fallidas del otro servicio
        results.total = rows.length; // ya
        // successful y failed de users ya reflejados arriba; añadimos al summary final via log
        console.warn('[ALERT][BULK_USERS] patients forwarded', { total: patientRows.length, ok, fail });
      } catch (e) {
        console.error('[ALERT][BULK_USERS] patients forward error', e);
      }
    }

    const totalSuccess = results.successful.length + patientOk;
    const totalFailed = results.failed.length + patientFail;
    console.warn('[ALERT][BULK_USERS] summary', {
      total: results.total,
      successful: totalSuccess,
      failed: totalFailed,
    });

    res.status(200).json({
      message: 'Importación completada',
      summary: {
        total: results.total,
        successful: totalSuccess,
        failed: totalFailed,
      },
      results,
    });
  } catch (error: unknown) {
    console.error('[ALERT][BULK_USERS] unhandled', error);
    next(error);
  }
}

export default { bulkImportPatients };
