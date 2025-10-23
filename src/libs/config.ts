import dotenv from 'dotenv';
dotenv.config();

export const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
export const DATABASE_URL = process.env.DATABASE_URL;
export const AUTH_SERVICE_URL =
  process.env.AUTH_SERVICE_URL || 'http://localhost:3001';
export const PATIENTS_SERVICE_URL =
  process.env.PATIENTS_SERVICE_URL || 'http://localhost:3003';
export const SMTP_PASS = process.env.SMTP_PASS;
export const SMTP_USER = process.env.SMTP_USER;
export const SMTP_HOST = process.env.SMTP_HOST;
export const SMTP_PORT = process.env.SMTP_PORT;
export const NODE_ENV = process.env.NODE_ENV;
