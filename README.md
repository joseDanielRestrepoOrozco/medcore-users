# MedCore Users Service 🏥

Microservicio de gestión de usuarios del sistema MedCore, consolidando funcionalidades de usuarios generales y pacientes.

## 📋 Tabla de Contenidos

- [Características](#-características)
- [Arquitectura](#-arquitectura)
- [Instalación](#-instalación)
- [Configuración](#-configuración)
- [Uso](#-uso)
- [API Endpoints](#-api-endpoints)
- [Migración](#-migración)

## 🚀 Características

- ✅ Gestión completa de usuarios (CRUD)
- ✅ Soporte para múltiples roles: Médico, Enfermera, Paciente, Administrador
- ✅ Campos embebidos específicos por rol (tipos compuestos Prisma)
- ✅ Búsqueda avanzada de pacientes
- ✅ Importación masiva de usuarios via CSV
- ✅ Autenticación JWT con permisos por rol
- ✅ Validación de emails con códigos de verificación
- ✅ Encriptación de contraseñas con bcrypt
- ✅ Paginación en todas las consultas
- ✅ Soft delete (desactivación de usuarios)

## 🏗 Arquitectura

### Modelo de Datos

```
Users (colección principal)
├── Datos base (todos los roles)
│   ├── email (único)
│   ├── documentNumber (único)
│   ├── fullname
│   ├── current_password (hash)
│   ├── role (MEDICO | ENFERMERA | PACIENTE | ADMINISTRADOR)
│   ├── date_of_birth
│   ├── age (calculado)
│   ├── gender
│   ├── phone
│   └── status (PENDING | ACTIVE | INACTIVE)
├── medico (embebido - solo para MEDICO)
│   ├── especialtyId (ref a Especialty)
│   └── license_number
├── enfermera (embebido - solo para ENFERMERA)
│   └── departmentId (ref a Department)
├── paciente (embebido - solo para PACIENTE)
│   ├── gender
│   └── address
└── administrador (embebido - solo para ADMINISTRADOR)
    ├── nivelAcceso
    └── departamentoAsignado

Department (colección)
├── name
├── description
└── especialties (relación con Especialty)

Especialty (colección)
├── name
├── description
└── departmentId (ref a Department)
```

## 📦 Instalación

```bash
# Clonar el repositorio
git clone <repo-url>

# Navegar al directorio
cd medcore-users

# Instalar dependencias
npm install

# Generar Prisma Client
npx prisma generate
```

## ⚙️ Configuración

Crear archivo `.env` basado en `.env.example`:

```env
# Database
DATABASE_URL="mongodb+srv://user:password@cluster.mongodb.net/medcore?retryWrites=true&w=majority"

# Server
PORT=3001

# JWT
JWT_SECRET="your-secret-key-here"
JWT_EXPIRES_IN="24h"

# Email (para verificación)
EMAIL_USER="your-email@gmail.com"
EMAIL_PASS="your-app-password"
```

## 🎯 Uso

### Desarrollo

```bash
npm run dev
```

### Producción

```bash
npm run build
npm start
```

### Docker

```bash
docker-compose up -d
```

## 📡 API Endpoints

### Estructura de Rutas

El servicio está organizado en 4 categorías de rutas:

#### 1. Rutas Generales (`/api`)

Operaciones sobre todos los usuarios sin distinción de rol.

| Método | Endpoint            | Descripción              | Roles                            |
| ------ | ------------------- | ------------------------ | -------------------------------- |
| GET    | `/api`              | Listar usuarios          | ADMINISTRADOR                    |
| GET    | `/api/:id`          | Obtener usuario          | ADMINISTRADOR, MEDICO, ENFERMERA |
| POST   | `/api`              | Crear usuario            | ADMINISTRADOR                    |
| PUT    | `/api/:id`          | Actualizar usuario       | ADMINISTRADOR                    |
| DELETE | `/api/:id`          | Desactivar usuario       | ADMINISTRADOR                    |
| GET    | `/api/stats`        | Estadísticas             | ADMINISTRADOR                    |
| GET    | `/api/by-role`      | Filtrar por rol          | ADMINISTRADOR                    |
| GET    | `/api/by-specialty` | Médicos por especialidad | ADMINISTRADOR                    |
| POST   | `/api/bulkUsers`    | Importación CSV          | ADMINISTRADOR                    |

#### 2. Rutas de Doctores (`/api/users/doctors`)

| Método | Endpoint                        | Descripción       | Roles                            |
| ------ | ------------------------------- | ----------------- | -------------------------------- |
| GET    | `/api/users/doctors`            | Listar doctores   | ADMINISTRADOR, MEDICO, ENFERMERA |
| POST   | `/api/users/doctors`            | Crear doctor      | ADMINISTRADOR                    |
| GET    | `/api/users/doctors/:id`        | Obtener doctor    | ADMINISTRADOR, MEDICO, ENFERMERA |
| PUT    | `/api/users/doctors/:id`        | Actualizar doctor | ADMINISTRADOR                    |
| PATCH  | `/api/users/doctors/status/:id` | Actualizar estado | ADMINISTRADOR                    |

#### 3. Rutas de Enfermeras (`/api/users/nurses`)

| Método | Endpoint                       | Descripción          | Roles                            |
| ------ | ------------------------------ | -------------------- | -------------------------------- |
| POST   | `/api/users/nurses`            | Crear enfermera      | ADMINISTRADOR                    |
| GET    | `/api/users/nurses/:id`        | Obtener enfermera    | ADMINISTRADOR, MEDICO, ENFERMERA |
| PUT    | `/api/users/nurses/:id`        | Actualizar enfermera | ADMINISTRADOR                    |
| PATCH  | `/api/users/nurses/status/:id` | Actualizar estado    | ADMINISTRADOR                    |

#### 4. Rutas de Pacientes (`/api/users/patients`)

| Método | Endpoint                              | Descripción         | Roles                            |
| ------ | ------------------------------------- | ------------------- | -------------------------------- |
| POST   | `/api/users/patients`                 | Crear paciente      | ADMINISTRADOR                    |
| GET    | `/api/users/patients`                 | Listar pacientes    | MEDICO, ENFERMERA, ADMINISTRADOR |
| GET    | `/api/users/patients/search/advanced` | Búsqueda avanzada   | MEDICO, ENFERMERA, ADMINISTRADOR |
| GET    | `/api/users/patients/:id`             | Obtener paciente    | MEDICO, ENFERMERA, ADMINISTRADOR |
| PUT    | `/api/users/patients/:id`             | Actualizar paciente | ADMINISTRADOR                    |
| PATCH  | `/api/users/patients/:id/state`       | Actualizar estado   | ADMINISTRADOR                    |

### Ejemplos de Uso

#### Crear Médico

```bash
POST /api/users/doctors
Content-Type: application/json
Authorization: Bearer <token>

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

#### Crear Paciente

```bash
POST /api/users/patients
Content-Type: application/json
Authorization: Bearer <token>

{
  "email": "paciente@email.com",
  "current_password": "Pass123",
  "fullname": "María García",
  "documentNumber": "987654321",
  "phone": "+57 310 987 6543",
  "gender": "F",
  "date_of_birth": "1990-08-20",
  "paciente": {
    "gender": "F",
    "address": "Calle 123 #45-67, Manizales"
  }
}
```

#### Búsqueda Avanzada de Pacientes

```bash
GET /api/users/patients/search/advanced?gender=M&dateFrom=2024-01-01&dateTo=2024-12-31&page=1&limit=20
Authorization: Bearer <token>
```

Parámetros disponibles:

- `documentNumber`: Búsqueda exacta
- `gender`: Filtro por género
- `address`: Búsqueda parcial en dirección
- `dateFrom`: Fecha inicio (registro)
- `dateTo`: Fecha fin (registro)
- `page`: Número de página
- `limit`: Registros por página

## 🔄 Migración

### Desde la Versión Anterior

Este microservicio ahora consolida la funcionalidad de `medcore-patients`. Ver detalles completos en [MIGRATION_NOTES.md](./MIGRATION_NOTES.md).

#### Cambios Principales

1. **Nuevo campo obligatorio**: `documentNumber`
2. **Campos embebidos por rol**: En lugar de campos planos
3. **Endpoints de pacientes**: Migrados a `/api/users/patients`
4. **Tipos compuestos Prisma**: Uso de embedded documents

#### Pasos de Migración

1. Backup de la base de datos
2. Regenerar Prisma Client: `npx prisma generate`
3. Ejecutar script de migración de datos (pendiente)
4. Actualizar frontend para usar nuevos endpoints
5. Deprecar `medcore-patients`

### Breaking Changes

⚠️ **Atención**: Los siguientes cambios no son compatibles hacia atrás:

- Campo `documentNumber` ahora es obligatorio
- `specialization` → `medico.especialtyId` (requiere ObjectId)
- `department` → `enfermera.departmentId` (requiere ObjectId)
- `license_number` → `medico.license_number`
- Endpoints de patients movidos de `/api/patients` a `/api/users/patients`

## 📚 Documentación Adicional

- [API Documentation](./API_DOCUMENTATION.md) - Documentación completa de endpoints
- [Migration Notes](./MIGRATION_NOTES.md) - Guía detallada de migración
- [Bulk Import Guide](./README_CARGA_MASIVA.md) - Importación masiva via CSV

## 🛠 Stack Tecnológico

- **Runtime**: Node.js + TypeScript
- **Framework**: Express.js
- **ORM**: Prisma (MongoDB)
- **Validación**: Zod
- **Autenticación**: JWT (jsonwebtoken)
- **Encriptación**: bcrypt
- **Email**: Nodemailer
- **Dev**: tsx (TypeScript execution)

## 🔐 Seguridad

- ✅ Contraseñas hasheadas con bcrypt (10 rounds)
- ✅ JWT con expiración configurable
- ✅ Validación de permisos por rol en cada endpoint
- ✅ Sanitización de respuestas (no se exponen hashes ni códigos)
- ✅ Validación de entradas con Zod
- ✅ Verificación de email con códigos temporales

## 🧪 Testing

```bash
# Ejecutar tests
npm test

# Coverage
npm run test:coverage
```

## 📝 Notas de Desarrollo

### Estructura del Proyecto

```
medcore-users/
├── prisma/
│   └── schema.prisma          # Schema de Prisma
├── src/
│   ├── config/                # Configuraciones (email, multer)
│   ├── controllers/           # Controladores por dominio
│   ├── middleware/            # Auth, errorHandler, upload
│   ├── routes/                # Definición de rutas
│   ├── schemas/               # Validaciones Zod
│   ├── services/              # Lógica de negocio
│   ├── types/                 # Tipos TypeScript
│   ├── libs/                  # Utilidades
│   ├── app.ts                 # Configuración de Express
│   └── index.ts               # Entry point
├── .env                       # Variables de entorno
├── .env.example               # Template de .env
├── docker-compose.yml         # Configuración Docker
├── Dockerfile                 # Imagen Docker
├── package.json               # Dependencias
├── tsconfig.json              # Config TypeScript
└── README.md                  # Este archivo
```

### Convenciones de Código

- **Naming**: camelCase para variables/funciones, PascalCase para tipos/clases
- **Async/Await**: Preferido sobre promises encadenadas
- **Error Handling**: Try-catch en controllers, throw errors en services
- **Tipos**: Inferidos de Prisma y validados con Zod
- **Comentarios**: JSDoc para funciones exportadas

## 🤝 Contribución

1. Fork del repositorio
2. Crear rama feature: `git checkout -b feature/nueva-funcionalidad`
3. Commit cambios: `git commit -m 'Add: nueva funcionalidad'`
4. Push a la rama: `git push origin feature/nueva-funcionalidad`
5. Abrir Pull Request

## 📄 Licencia

Este proyecto es parte de MedCore y está bajo licencia privada de la Universidad de Caldas.

## 👥 Equipo

- **Desarrollo**: Carlos Gómez, Ana Suárez, José Restrepo
- **Universidad**: Universidad de Caldas
- **Curso**: Software II - Semestre VII

---

**Última actualización**: 24 de octubre de 2025  
**Versión**: 2.0.0
