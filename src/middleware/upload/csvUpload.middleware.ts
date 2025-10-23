import multer from 'multer';
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

export default {
  uploadSingle: csvUpload.single('document'),
  uploadMultiple: csvUpload.array('documents', 5),
};
