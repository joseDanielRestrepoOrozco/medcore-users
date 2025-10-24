# Estructura de Rutas - MedCore Users Service

## 📋 Organización de Rutas

El sistema de rutas está organizado en 4 categorías principales:

### 1. Rutas Generales (`/`)

Operaciones generales sobre todos los usuarios, sin distinción de rol.

### 2. Rutas de Doctores (`/users/doctors`)

Operaciones específicas para usuarios con rol MEDICO.

### 3. Rutas de Enfermeras (`/users/nurses`)

Operaciones específicas para usuarios con rol ENFERMERA.

### 4. Rutas de Pacientes (`/users/patients`)

Operaciones específicas para usuarios con rol PACIENTE.

---

## 🔗 Endpoints Disponibles

### Rutas Generales de Usuarios

**Base:** `/api` (sin prefijo adicional)

| Método | Endpoint                         | Descripción               | Roles Autorizados                |
| ------ | -------------------------------- | ------------------------- | -------------------------------- |
| GET    | `/`                              | Listar todos los usuarios | ADMINISTRADOR                    |
| GET    | `/:id`                           | Obtener usuario por ID    | ADMINISTRADOR, MEDICO, ENFERMERA |
| POST   | `/`                              | Crear nuevo usuario       | ADMINISTRADOR                    |
| PUT    | `/:id`                           | Actualizar usuario        | ADMINISTRADOR                    |
| DELETE | `/:id`                           | Desactivar usuario        | ADMINISTRADOR                    |
| GET    | `/by-role?role=MEDICO`           | Filtrar por rol           | ADMINISTRADOR                    |
| GET    | `/by-specialty?especialtyId=xxx` | Médicos por especialidad  | ADMINISTRADOR                    |
| GET    | `/stats`                         | Estadísticas de usuarios  | ADMINISTRADOR                    |
| POST   | `/bulkUsers`                     | Importación masiva CSV    | ADMINISTRADOR                    |

---

### Rutas de Doctores

**Base:** `/api/users/doctors`

| Método | Endpoint      | Descripción                  | Roles Autorizados                |
| ------ | ------------- | ---------------------------- | -------------------------------- |
| GET    | `/`           | Listar todos los doctores    | ADMINISTRADOR, MEDICO, ENFERMERA |
| POST   | `/`           | Crear nuevo doctor           | ADMINISTRADOR                    |
| GET    | `/:id`        | Obtener doctor por ID        | ADMINISTRADOR, MEDICO, ENFERMERA |
| PUT    | `/:id`        | Actualizar doctor            | ADMINISTRADOR                    |
| PATCH  | `/status/:id` | Actualizar estado del doctor | ADMINISTRADOR                    |

**Ejemplo de Creación:**

```json
POST /api/users/doctors
{
  "email": "doctor@hospital.com",
  "current_password": "SecurePass123",
  "fullname": "Dr. Juan Pérez",
  "documentNumber": "123456789",
  "phone": "+57 300 123 4567",
  "date_of_birth": "1980-05-15",
  "medico": {
    "especialtyId": "507f1f77bcf86cd799439011",
    "license_number": "MED-12345"
  }
}
```

---

### Rutas de Enfermeras

**Base:** `/api/users/nurses`

| Método | Endpoint      | Descripción                    | Roles Autorizados                |
| ------ | ------------- | ------------------------------ | -------------------------------- |
| POST   | `/`           | Crear nueva enfermera          | ADMINISTRADOR                    |
| GET    | `/:id`        | Obtener enfermera por ID       | ADMINISTRADOR, MEDICO, ENFERMERA |
| PUT    | `/:id`        | Actualizar enfermera           | ADMINISTRADOR                    |
| PATCH  | `/status/:id` | Actualizar estado de enfermera | ADMINISTRADOR                    |

**Ejemplo de Creación:**

```json
POST /api/users/nurses
{
  "email": "enfermera@hospital.com",
  "current_password": "SecurePass123",
  "fullname": "Enf. María López",
  "documentNumber": "987654321",
  "phone": "+57 310 987 6543",
  "date_of_birth": "1985-08-20",
  "enfermera": {
    "departmentId": "507f1f77bcf86cd799439022"
  }
}
```

---

### Rutas de Pacientes

**Base:** `/api/users/patients`

| Método | Endpoint           | Descripción                    | Roles Autorizados                |
| ------ | ------------------ | ------------------------------ | -------------------------------- |
| GET    | `/`                | Listar todos los pacientes     | MEDICO, ENFERMERA, ADMINISTRADOR |
| POST   | `/`                | Crear nuevo paciente           | ADMINISTRADOR                    |
| GET    | `/search/advanced` | Búsqueda avanzada              | MEDICO, ENFERMERA, ADMINISTRADOR |
| GET    | `/:id`             | Obtener paciente por ID        | MEDICO, ENFERMERA, ADMINISTRADOR |
| PUT    | `/:id`             | Actualizar paciente completo   | ADMINISTRADOR                    |
| PATCH  | `/:id/state`       | Actualizar estado del paciente | ADMINISTRADOR                    |

**Ejemplo de Creación:**

```json
POST /api/users/patients
{
  "email": "paciente@email.com",
  "current_password": "Pass123",
  "fullname": "María García",
  "documentNumber": "456789123",
  "phone": "+57 320 456 7890",
  "gender": "F",
  "date_of_birth": "1990-12-10",
  "paciente": {
    "gender": "F",
    "address": "Calle 123 #45-67, Manizales"
  }
}
```

**Búsqueda Avanzada - Parámetros:**

```
GET /api/users/patients/search/advanced?gender=M&dateFrom=2024-01-01&dateTo=2024-12-31
```

Parámetros disponibles:

- `documentNumber`: Búsqueda exacta por documento
- `gender`: Filtro por género
- `address`: Búsqueda parcial en dirección
- `dateFrom`: Fecha inicio (registro)
- `dateTo`: Fecha fin (registro)
- `page`: Número de página (default: 1)
- `limit`: Registros por página (default: 10, max: 100)

---

## 🔐 Autenticación y Autorización

Todos los endpoints requieren:

1. **Token JWT** en el header `Authorization: Bearer <token>`
2. **Rol apropiado** según la tabla de permisos arriba

### Obtener Token

```bash
POST /api/auth/login
{
  "email": "user@hospital.com",
  "current_password": "password123"
}
```

---

## 📊 Ejemplos de Uso Completos

### 1. Listar todos los doctores

```bash
GET /api/users/doctors
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 2. Crear un paciente

```bash
POST /api/users/patients
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "email": "nuevo.paciente@email.com",
  "current_password": "SecurePass123",
  "fullname": "Carlos Ramírez",
  "documentNumber": "111222333",
  "phone": "+57 300 111 2222",
  "gender": "M",
  "date_of_birth": "1995-03-15",
  "paciente": {
    "gender": "M",
    "address": "Carrera 23 #12-34, Manizales"
  }
}
```

### 3. Búsqueda avanzada de pacientes

```bash
GET /api/users/patients/search/advanced?gender=F&dateFrom=2024-01-01&page=1&limit=20
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 4. Actualizar estado de un doctor

```bash
PATCH /api/users/doctors/status/507f1f77bcf86cd799439011
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "status": "INACTIVE"
}
```

### 5. Obtener estadísticas generales

```bash
GET /api/stats
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Respuesta:**

```json
{
  "total": 150,
  "byStatus": {
    "active": 120,
    "pending": 20,
    "inactive": 10
  },
  "byRole": [
    { "role": "MEDICO", "count": 30 },
    { "role": "ENFERMERA", "count": 40 },
    { "role": "PACIENTE", "count": 75 },
    { "role": "ADMINISTRADOR", "count": 5 }
  ]
}
```

---

## 🚨 Códigos de Error Comunes

| Código | Descripción           | Causa Común                        |
| ------ | --------------------- | ---------------------------------- |
| 400    | Bad Request           | Datos inválidos en el body         |
| 401    | Unauthorized          | Token inválido o expirado          |
| 403    | Forbidden             | Permisos insuficientes para el rol |
| 404    | Not Found             | Usuario/recurso no encontrado      |
| 409    | Conflict              | Email o documentNumber duplicado   |
| 500    | Internal Server Error | Error del servidor                 |

---

## 📝 Notas Importantes

### Orden de las Rutas

El orden de montaje en `router.ts` es crítico:

1. **Primero**: Rutas específicas (`/users/doctors`, `/users/nurses`, `/users/patients`)
2. **Último**: Rutas generales (`/`)

Esto evita que rutas generales capturen requests destinados a rutas específicas.

### Rutas de Búsqueda

Las rutas de búsqueda avanzada (`/search/advanced`) deben definirse **antes** que las rutas con parámetros dinámicos (`/:id`) para evitar conflictos de matching.

### Migración desde medcore-patients

Las siguientes rutas fueron migradas:

- `POST /api/patients` → `POST /api/users/patients`
- `GET /api/patients` → `GET /api/users/patients`
- `GET /api/patients/search/advanced` → `GET /api/users/patients/search/advanced`
- `GET /api/patients/:id` → `GET /api/users/patients/:id`
- `PUT /api/patients/:id` → `PUT /api/users/patients/:id`
- `PATCH /api/patients/:id/state` → `PATCH /api/users/patients/:id/state`

---

## 🔄 Flujo de Request

```
Client Request
    ↓
API Gateway (opcional)
    ↓
/api (app.ts)
    ↓
router.ts
    ├── /users/doctors → doctors.routes.ts → doctorsController
    ├── /users/nurses → nurses.routes.ts → nursesController
    ├── /users/patients → patients.routes.ts → usersController
    └── / → users.routes.ts → usersController (general)
```

---

**Última actualización:** 24 de octubre de 2025  
**Versión:** 2.0.0
