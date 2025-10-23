import express from 'express';

const app = express();

app.use(express.json());

// Health
app.get('/', (_req, res) => {
  res.send('Users Service is running');
});

// Stubs solo si USE_STUBS=true
if (process.env.USE_STUBS === 'true') {
  type User = { id: string; email: string; fullname: string; role: string; status: string; createdAt?: string };
  const seedUsers: User[] = [
    { id: 'u1', email: 'admin@example.com', fullname: 'Admin Uno', role: 'ADMINISTRADOR', status: 'VERIFIED', createdAt: new Date().toISOString() },
    { id: 'u2', email: 'medico@example.com', fullname: 'Dra. Demo', role: 'MEDICO', status: 'VERIFIED', createdAt: new Date().toISOString() },
    { id: 'u3', email: 'enfermera@example.com', fullname: 'Enfermera Demo', role: 'ENFERMERA', status: 'PENDING', createdAt: new Date().toISOString() },
  ];
  let users: User[] = [...seedUsers];

  app.get('/api/v1/users', (req, res) => {
    const { role, status } = req.query as { role?: string; status?: string };
    let filtered = users;
    if (role) filtered = filtered.filter((u) => (u.role || '').toUpperCase() === String(role).toUpperCase());
    if (status) filtered = filtered.filter((u) => (u.status || '').toUpperCase() === String(status).toUpperCase());
    const page = Number(req.query.page || 1);
    const limit = Number(req.query.limit || 50);
    const start = (page - 1) * limit;
    const slice = filtered.slice(start, start + limit);
    res.json({ pagination: { page, limit, total: filtered.length }, users: slice });
  });

  app.post('/api/v1/users', (req, res) => {
    const { email, fullname, role } = req.body || {};
    const id = `u${users.length + 1}`;
    const u: User = {
      id,
      email: email || `nuevo${users.length + 1}@example.com`,
      fullname: fullname || 'Usuario Nuevo',
      role: (role || 'MEDICO').toUpperCase(),
      status: 'VERIFIED',
      createdAt: new Date().toISOString(),
    };
    users = [u, ...users];
    res.status(201).json(u);
  });

  app.put('/api/v1/users/:id/role', (req, res) => {
    const { id } = req.params;
    const { role } = req.body || {};
    users = users.map((u) => (u.id === id ? { ...u, role: String(role || u.role).toUpperCase() } : u));
    res.json({ message: 'Rol actualizado' });
  });
}

export default app;
