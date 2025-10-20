import dotenv from 'dotenv';
dotenv.config();

export const PORT = process.env.PORT;
export const DATABASE_URL = process.env.DATABASE_URL;
export const AUTH_SERVICE_URL =
  process.env.AUTH_SERVICE_URL || 'http://localhost:3001';
