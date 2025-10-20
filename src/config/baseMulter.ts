import multer, { type FileFilterCallback, type StorageEngine } from 'multer';
import fs from 'fs';
import path from 'path';
import { type Request } from 'express';

/**
 * Crea un directorio si no existe.
 */
export const ensureDirectoryExists = (directory: string): void => {
  if (!fs.existsSync(directory)) {
    fs.mkdirSync(directory, { recursive: true });
  }
};

/**
 * Crea un filtro genérico para extensiones o MIME types permitidos.
 */
export const createFileFilter = (options: {
  allowedExtensions?: string[];
  allowedMimeTypes?: string[];
  errorMessage?: string;
}) => {
  const {
    allowedExtensions = [],
    allowedMimeTypes = [],
    errorMessage,
  } = options;

  return (
    _req: Request,
    file: Express.Multer.File,
    cb: FileFilterCallback
  ): void => {
    const ext = path.extname(file.originalname).toLowerCase();
    const mimetype = file.mimetype.toLowerCase();

    const extAllowed =
      allowedExtensions.length === 0 || allowedExtensions.includes(ext);
    const mimeAllowed =
      allowedMimeTypes.length === 0 || allowedMimeTypes.includes(mimetype);

    if (extAllowed && mimeAllowed) return cb(null, true);

    cb(
      new Error(
        errorMessage || `Tipo de archivo no permitido: ${file.originalname}`
      )
    );
  };
};

/**
 * Crea un middleware Multer con opciones flexibles.
 */
export const createUploader = (options: {
  storage: StorageEngine;
  limits?: multer.Options['limits'];
  fileFilter?: multer.Options['fileFilter'];
}) => multer(options);
