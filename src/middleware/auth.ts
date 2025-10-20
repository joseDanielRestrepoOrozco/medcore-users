import { type NextFunction, type Request, type Response } from 'express';
import { AUTH_SERVICE_URL } from '../libs/config.js';

/**
 * Middleware que valida el JWT llamando al servicio AUTH
 * El servicio AUTH verifica el token y retorna los datos del usuario desde la BD
 */
export const authenticateToken = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'No token provided' });
      return;
    }

    // Llamar al servicio AUTH para verificar el token
    const response = await fetch(
      `${AUTH_SERVICE_URL}/api/v1/auth/verify-token`,
      {
        method: 'POST',
        headers: {
          Authorization: authHeader,
          'Content-Type': 'application/json',
        },
      }
    );
    console.log('Response from AUTH service is OK');

    if (!response.ok) {
      const errorData = await response.json();
      console.log('Error from AUTH service:', errorData);
      res.status(response.status).json(errorData);
      return;
    }


    const data = await response.json();

    if (!data.valid || !data.user) {
      res.status(403).json({ error: 'Invalid token' });
      return;
    }

    // Agregar usuario al request (rol viene de la BD, no del token)
    req.user = data.user;
    next();
    console.log('[authenticateToken] User authenticated:', req.user);
  } catch (error) {
    console.error('[authenticateToken] Error:', error);
    res.status(500).json({ error: 'Authentication service error' });
  }
};

/**
 * Middleware para validar roles permitidos
 */
export const requireRoles = (allowedRoles: string[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      res.status(401).json({ error: 'No token provided' });
      return;
    }
    // Llamar al servicio AUTH para verificar el token
    const response = await fetch(
      `${AUTH_SERVICE_URL}/api/v1/auth/verify-token?allowedRoles=${allowedRoles.join(
        ','
      )}`,
      {
        method: 'GET',
        headers: {
          Authorization: authHeader,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      res.status(response.status).json(errorData);
      return;
    }

    const data = await response.json();

    req.user = data.user;

    next();
  };
};
