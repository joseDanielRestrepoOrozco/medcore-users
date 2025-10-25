import { type NextFunction, type Request, type Response } from 'express';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';
import { z } from 'zod';

const errorHandler = (
  error: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
) => {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    console.error('[Prisma Error]', error.message, error);
    if (error.code === 'P2023') {
      res.status(400).json({ error: 'ID no válido' });
      return;
    } else if (error.code === 'P2002') {
      res.status(400).json({
        error: 'valor para campo unico ya está en uso.',
      });
      return;
    }
    res.status(500).json({ error: 'Error en la base de datos' });
    return;
  } else if (error instanceof ZodError) {
    console.log(error.message);
    const flattened = z.treeifyError(error);
    res.status(400).json(flattened);
    return;
  }

  // Log desconocidos y responder 500 genérico
  const message = error instanceof Error ? error.message : String(error);
  console.error('[Unhandled Error]', message, error);
  res.status(500).json({ error: 'Internal server error' });
};

export default errorHandler;
