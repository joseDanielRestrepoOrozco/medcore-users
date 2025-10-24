# Resumen de Reorganización de Rutas

## ✅ Cambios Implementados

Se ha reorganizado completamente la estructura de rutas del microservicio `medcore-users` para una mejor organización y claridad.

### Antes (Estructura Antigua)

```
/api/users              → Rutas generales de usuarios
/api/users/patients/*   → Rutas de pacientes mezcladas
/api/users/doctors      → Rutas de doctores (externas)
/api/users/nurses       → Rutas de enfermeras (externas)
```

### Ahora (Nueva Estructura)

```
/api                    → Rutas generales de usuarios
/api/users/doctors      → Rutas específicas de doctores
/api/users/nurses       → Rutas específicas de enfermeras
/api/users/patients     → Rutas específicas de pacientes
```

---

## 📁 Archivos Modificados/Creados

### Nuevos Archivos

✅ `src/routes/patients.routes.ts` - Rutas específicas de pacientes

### Archivos Modificados

✅ `src/routes/router.ts` - Router principal con nueva organización
✅ `src/routes/users.routes.ts` - Solo rutas generales
✅ `README.md` - Documentación actualizada
✅ `ROUTES_DOCUMENTATION.md` - Nueva documentación de rutas

---

## 🔗 Nueva Estructura de Endpoints

### 1. Rutas Generales (Base: `/api`)

| Endpoint        | Método | Descripción                      |
| --------------- | ------ | -------------------------------- |
| `/`             | GET    | Listar todos los usuarios        |
| `/:id`          | GET    | Obtener usuario por ID           |
| `/`             | POST   | Crear usuario genérico           |
| `/:id`          | PUT    | Actualizar usuario               |
| `/:id`          | DELETE | Desactivar usuario               |
| `/by-role`      | GET    | Filtrar usuarios por rol         |
| `/by-specialty` | GET    | Filtrar médicos por especialidad |
| `/stats`        | GET    | Obtener estadísticas             |
| `/bulkUsers`    | POST   | Importación masiva CSV           |

### 2. Rutas de Doctores (Base: `/api/users/doctors`)

| Endpoint      | Método | Descripción           |
| ------------- | ------ | --------------------- |
| `/`           | GET    | Listar doctores       |
| `/`           | POST   | Crear doctor          |
| `/:id`        | GET    | Obtener doctor por ID |
| `/:id`        | PUT    | Actualizar doctor     |
| `/status/:id` | PATCH  | Actualizar estado     |

### 3. Rutas de Enfermeras (Base: `/api/users/nurses`)

| Endpoint      | Método | Descripción              |
| ------------- | ------ | ------------------------ |
| `/`           | POST   | Crear enfermera          |
| `/:id`        | GET    | Obtener enfermera por ID |
| `/:id`        | PUT    | Actualizar enfermera     |
| `/status/:id` | PATCH  | Actualizar estado        |

### 4. Rutas de Pacientes (Base: `/api/users/patients`)

| Endpoint           | Método | Descripción             |
| ------------------ | ------ | ----------------------- |
| `/`                | POST   | Crear paciente          |
| `/`                | GET    | Listar pacientes        |
| `/search/advanced` | GET    | Búsqueda avanzada       |
| `/:id`             | GET    | Obtener paciente por ID |
| `/:id`             | PUT    | Actualizar paciente     |
| `/:id/state`       | PATCH  | Actualizar estado       |

---

## 🔄 Flujo de Routing

```
Cliente → API Gateway (opcional)
    ↓
app.ts → router.use('/api', mainRouter)
    ↓
router.ts
    ├─ /users/doctors → doctors.routes.ts
    ├─ /users/nurses → nurses.routes.ts
    ├─ /users/patients → patients.routes.ts
    └─ / → users.routes.ts (general)
```

---

## 📝 Cambios en Controllers

No se requirieron cambios en los controllers. Todos los métodos ya existentes se mantienen:

- `usersController` - Maneja rutas generales y pacientes
- `doctorsController` - Maneja rutas de doctores
- `nursesController` - Maneja rutas de enfermeras

---

## 🧪 Testing de las Nuevas Rutas

### Doctores

```bash
# Crear doctor
POST /api/users/doctors
{
  "email": "doctor@test.com",
  "current_password": "Test123",
  "fullname": "Dr. Test",
  "documentNumber": "123456",
  "date_of_birth": "1980-01-01",
  "medico": {
    "especialtyId": "507f1f77bcf86cd799439011",
    "license_number": "MED-001"
  }
}

# Listar doctores
GET /api/users/doctors

# Actualizar estado
PATCH /api/users/doctors/status/507f1f77bcf86cd799439011
{ "status": "ACTIVE" }
```

### Enfermeras

```bash
# Crear enfermera
POST /api/users/nurses
{
  "email": "nurse@test.com",
  "current_password": "Test123",
  "fullname": "Nurse Test",
  "documentNumber": "789012",
  "date_of_birth": "1985-01-01",
  "enfermera": {
    "departmentId": "507f1f77bcf86cd799439022"
  }
}
```

### Pacientes

```bash
# Crear paciente
POST /api/users/patients
{
  "email": "patient@test.com",
  "current_password": "Test123",
  "fullname": "Patient Test",
  "documentNumber": "345678",
  "gender": "M",
  "date_of_birth": "1990-01-01",
  "paciente": {
    "gender": "M",
    "address": "Test Address"
  }
}

# Búsqueda avanzada
GET /api/users/patients/search/advanced?gender=M&page=1&limit=10
```

### Rutas Generales

```bash
# Listar todos los usuarios
GET /api

# Estadísticas
GET /api/stats

# Filtrar por rol
GET /api/by-role?role=MEDICO
```

---

## ⚠️ Breaking Changes

### Para Frontend/API Gateway

**Antes:**

```javascript
// Pacientes
fetch("/api/users/patients"); // ❌ Incorrecto ahora

// Doctores (si venían de users)
fetch("/api/users"); // ❌ Devolvía todos
```

**Ahora:**

```javascript
// Pacientes
fetch("/api/users/patients"); // ✅ Correcto (sin cambios)

// Doctores
fetch("/api/users/doctors"); // ✅ Correcto (sin cambios)

// Usuarios generales
fetch("/api"); // ✅ Nuevo (antes era /api/users)
fetch("/api/stats"); // ✅ Nuevo (antes era /api/users/stats)
```

### Rutas que Cambiaron

| Antes                    | Ahora              | Nota                 |
| ------------------------ | ------------------ | -------------------- |
| `GET /api/users`         | `GET /api`         | Solo rutas generales |
| `GET /api/users/stats`   | `GET /api/stats`   | Sin prefijo users    |
| `GET /api/users/by-role` | `GET /api/by-role` | Sin prefijo users    |

### Rutas que NO Cambiaron

- ✅ `/api/users/doctors/*` - Igual
- ✅ `/api/users/nurses/*` - Igual
- ✅ `/api/users/patients/*` - Igual

---

## 🎯 Ventajas de la Nueva Estructura

1. **Claridad**: Cada tipo de usuario tiene su propia base de ruta
2. **Escalabilidad**: Fácil añadir nuevos roles (ej: `/api/users/admins`)
3. **Consistencia**: Estructura uniforme para todos los roles
4. **Separación**: Lógica de rutas separada en archivos dedicados
5. **RESTful**: Mejor adherencia a principios REST

---

## 📚 Documentación Actualizada

- ✅ `README.md` - Guía principal actualizada
- ✅ `ROUTES_DOCUMENTATION.md` - Documentación completa de rutas
- ✅ `MIGRATION_NOTES.md` - Notas de migración actualizadas

---

## ✨ Próximos Pasos

1. **Actualizar Frontend**

   - Cambiar llamadas de `/api/users` a `/api` para rutas generales
   - Mantener `/api/users/patients`, `/api/users/doctors`, `/api/users/nurses`

2. **Actualizar API Gateway** (si existe)

   - Actualizar configuración de rutas proxy
   - Ajustar rules de routing

3. **Tests**

   - Actualizar tests de integración con nuevas rutas
   - Verificar que todas las rutas respondan correctamente

4. **Documentación de API**
   - Actualizar Swagger/OpenAPI specs
   - Actualizar colección de Postman

---

**Fecha:** 24 de octubre de 2025  
**Autor:** Carlos Gómez  
**Versión:** 2.1.0
