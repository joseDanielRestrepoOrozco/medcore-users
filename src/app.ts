import express from 'express';
import { PrismaClient } from '@prisma/client';
import dns from 'dns';
import cors from 'cors';
import router from './routes/router.js';
import unknownEndpoint from './middleware/unknownEndpoint.js';
import errorHandler from './middleware/errorHandler.js';

dns.setDefaultResultOrder('ipv4first');
const app = express();
const prisma = new PrismaClient();
// Safe DB target log
(() => {
  const raw = process.env.DATABASE_URL || '';
  let host = '(unknown)';
  let db = '(unknown)';
  try {
    const repl = raw.replace('mongodb+srv://', 'http://').replace('mongodb://', 'http://');
    const u = new URL(repl);
    host = u.host;
    db = (u.pathname || '').replace(/^\//, '') || '(none)';
  } catch {
    const m = raw.match(/@([^/]+)\/?([^?]*)/);
    if (m) {
      host = m[1];
      db = m[2] || '(none)';
    }
  }
  console.log('[USERS] DB target', { host, db });
})();
// DB ping opcional (evita fallos por DNS de SRV). Actívalo con DB_PING=true
(async () => {
  const shouldPing = String(process.env.DB_PING || 'false').toLowerCase() === 'true';
  if (!shouldPing) return;
  try {
    if (typeof (prisma as unknown as { $runCommandRaw?: (cmd: unknown) => Promise<unknown> }).$runCommandRaw === 'function') {
      await (prisma as unknown as { $runCommandRaw: (cmd: unknown) => Promise<unknown> }).$runCommandRaw({ ping: 1 });
      const raw = process.env.DATABASE_URL || '';
      const isSrv = raw.startsWith('mongodb+srv://');
      const normalized = raw.replace(/^mongodb(\+srv)?:\/\//, 'http://');
      const u = new URL(normalized);
      const user = u.username ? encodeURIComponent(u.username) : '';
      const pass = u.password ? '***' : '';
      const auth = user ? `${user}:${pass}@` : '';
      const db = (u.pathname || '').replace(/^\//, '');
      const protocol = isSrv ? 'mongodb+srv://' : 'mongodb://';
      const query = u.search || '';
      const safeUrl = `${protocol}${auth}${u.host}/${db}${query}`;
      console.log('[USERS] DB ping ok ->', safeUrl);
    }
  } catch (e) {
    console.warn('[USERS] DB ping skipped/failed', (e as Error)?.message);
  }
})();

app.use(express.json());
app.use(cors());

// Routes
app.use('/api/v1', router);

// Debug connectivity
app.get('/api/v1/_debug/db', async (_req, res) => {
  try {
    const total = await prisma.users.count();
    res.json({ ok: true, service: 'users', users: total });
  } catch {
    res.status(500).json({ ok: false });
  }
});

app.use(unknownEndpoint);
app.use(errorHandler);

export default app;
