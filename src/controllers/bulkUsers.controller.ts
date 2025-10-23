import { type NextFunction, type Request, type Response } from 'express';
import bulkService from '../services/bulk.service.js';

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

    const result = await bulkService.importUsers(file);

    if (!result.success) {
      res.status(result.error!.status).json({ error: result.error!.message });
      return;
    }

    res.status(200).json(result.data);
  } catch (error: unknown) {
    next(error);
  }
}

export default { bulkImportPatients };
