import multer from 'multer';
import type { Request, Response, NextFunction } from 'express';
import { createUploader, createFileFilter } from '../../config/baseMulter.js';

const MAX_FILE_SIZE = 60 * 1024 * 1024; // 60 MB

const storage = multer.memoryStorage();

const fileFilter = createFileFilter({
  allowedExtensions: ['.csv', '.xlsx', '.xls', '.json'],
  errorMessage: 'Solo se permiten archivos CSV, XLSX, XLS o JSON',
});

const csvUpload = createUploader({
  storage,
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter,
});

type ReqWithFiles = Request & { file?: Express.Multer.File; files?: Express.Multer.File[] };

export default {
  uploadSingle: csvUpload.single('document'),
  uploadMultiple: csvUpload.array('documents', 5),
  // Acepta cualquier nombre de campo y luego fija req.file
  uploadAny: csvUpload.any(),
  ensureSingleFile: (req: ReqWithFiles, _res: Response, next: NextFunction) => {
    try {
      const files = req.files as Express.Multer.File[] | undefined;
      const single = req.file as Express.Multer.File | undefined;
      if (single) {
        console.log('[BULK_USERS] file(single)', {
          field: single.fieldname,
          name: single.originalname,
          type: single.mimetype,
          size: single.size,
        });
      }
      if (!single && Array.isArray(files)) {
        // prioriza 'document' o 'file'
        const prefer = (name: string) => files.find((f: Express.Multer.File) => f.fieldname === name);
        const chosen = prefer('document') || prefer('file') || files[0];
        if (chosen) {
          req.file = chosen;
          console.log('[BULK_USERS] file(any->chosen)', {
            field: chosen.fieldname,
            name: chosen.originalname,
            type: chosen.mimetype,
            size: chosen.size,
            candidates: files.map((f: Express.Multer.File) => f.fieldname),
          });
        }
      }
    } catch {
      // noop
    }
    if (!req.file && Array.isArray(req.files)) {
      // Prioriza 'file' (según doc) y luego 'document'
      const prefer = (name: string) => (req.files as Express.Multer.File[]).find((f: Express.Multer.File) => f.fieldname === name);
      req.file = prefer('file') || prefer('document') || req.files[0];
    }
    next();
  },
};
