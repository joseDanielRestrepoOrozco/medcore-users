import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { type NextFunction, type Request, type Response } from 'express';
import { ZodError } from 'zod';

const errorHandler = (
  error: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
) => {
  if (error instanceof PrismaClientKnownRequestError) {
    if (error.code === 'P2023') {
      res.status(400).json({ error: 'ID no válido' });
      return;
    }
    res.status(500).json({ error: 'Error en la base de datos' });
    return;
  } else if (error instanceof ZodError) {
    const first = error.issues[0]?.message || 'Datos inválidos';
    const flattened = error.flatten();
    res.status(400).json({ error: first, details: flattened.fieldErrors });
    return;
  }

  // Log desconocidos y responder 500 genérico
  const message = error instanceof Error ? error.message : String(error);
  console.error('[Unhandled Error]', message, error);
  res.status(500).json({ error: 'Internal server error' });
};

export default errorHandler;
