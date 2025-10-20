import { type Request, type Response } from 'express';

const unknownEndpoint = (_req: Request, res: Response) => {
  res.status(404).send({ error: 'unknown endpoint' });
};

export default unknownEndpoint;
