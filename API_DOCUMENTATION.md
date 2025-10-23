# API Documentation - Users Service

## Base URL

```
/api/v1
```

## Authentication

All endpoints require authentication with JWT token and specific role permissions.

---

## Table of Contents

1. [Users Endpoints](#users-endpoints)
2. [Doctors Endpoints](#doctors-endpoints)
3. [Nurses Endpoints](#nurses-endpoints)
4. [Common Errors](#common-error-responses)
5. [Data Models](#data-models)

---

# Users Endpoints

## 1. Get All Users

Retrieves a paginated list of all users with optional filters.

**Endpoint:** `GET /users`

**Auth Required:** `ADMINISTRADOR`

**Query Parameters:**
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| status | string | No | - | Filter by status: `PENDING`, `ACTIVE`, `INACTIVE` |
| page | number | No | 1 | Page number (min: 1) |
| limit | number | No | 10 | Items per page (max: 100) |

**Example Request:**

```bash
GET /users?status=ACTIVE&page=1&limit=10
```

**Success Response (200):**

```json
{
  "users": [
    {
      "id": "507f1f77bcf86cd799439011",
      "email": "doctor@example.com",
      "fullname": "Dr. Juan Pérez",
      "role": "MEDICO",
      "specialization": "Cardiología",
      "department": "Medicina Interna",
      "license_number": "12345",
      "date_of_birth": "1980-05-15T00:00:00.000Z",
      "age": 43,
      "phone": "+1234567890",
      "status": "ACTIVE",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  ],
  "pagination": {
    "total": 50,
    "page": 1,
    "limit": 10,
    "totalPages": 5
  }
}
```

---

## 2. Get Users By Role

Retrieves users filtered by a specific role (required parameter).

**Endpoint:** `GET /users/by-role`

**Auth Required:** `ADMINISTRADOR`

**Query Parameters:**
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| role | string | **Yes** | - | `MEDICO`, `ENFERMERA`, `PACIENTE`, `ADMINISTRADOR` |
| status | string | No | - | Filter by status: `PENDING`, `ACTIVE`, `INACTIVE` |
| page | number | No | 1 | Page number |
| limit | number | No | 10 | Items per page |

**Example Request:**

```bash
GET /users/by-role?role=MEDICO&status=ACTIVE
```

**Success Response (200):**
Same format as "Get All Users"

---

## 3. Get Users By Specialty

Retrieves doctors filtered by specialization (only for doctors).

**Endpoint:** `GET /users/by-specialty`

**Auth Required:** `ADMINISTRADOR`

**Query Parameters:**
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| specialty | string | No | - | Specialization to filter (e.g., "Cardiología", "Pediatría") |
| status | string | No | - | Filter by status |
| page | number | No | 1 | Page number |
| limit | number | No | 10 | Items per page |

**Example Request:**

```bash
GET /users/by-specialty?specialty=Cardiología
```

**Success Response (200):**
Same format as "Get All Users"

**Note:** This endpoint automatically filters for role `MEDICO`.

---

## 4. Get User By ID

Retrieves a single user by their ID.

**Endpoint:** `GET /users/:id`

**Auth Required:** `ADMINISTRADOR`, `MEDICO`, `ENFERMERA`

**URL Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| id | string | Yes | User MongoDB ObjectId |

**Example Request:**

```bash
GET /users/507f1f77bcf86cd799439011
```

**Success Response (200):**

```json
{
  "id": "507f1f77bcf86cd799439011",
  "email": "user@example.com",
  "fullname": "Juan Pérez",
  "role": "PACIENTE",
  "date_of_birth": "1990-05-15T00:00:00.000Z",
  "age": 33,
  "phone": "+1234567890",
  "status": "ACTIVE",
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

**Error Response (404):**

```json
{
  "error": "User not found"
}
```

---

## 5. Create User (Patient)

Creates a new patient user.

**Endpoint:** `POST /users`

**Auth Required:** `ADMINISTRADOR`

**Request Body:**

```json
{
  "email": "patient@example.com",
  "current_password": "Password123",
  "fullname": "María García",
  "phone": "+1234567890",
  "date_of_birth": "1995-03-20"
}
```

**Required Fields:**

- `email` (email format)
- `current_password` (min 6 chars, must contain at least one number)
- `fullname` (only letters and spaces)
- `date_of_birth` (ISO date format)

**Optional Fields:**

- `phone` (string)
- `status` (default: `PENDING`)

**Success Response (201):**

```json
{
  "id": "507f1f77bcf86cd799439011",
  "email": "patient@example.com",
  "fullname": "María García",
  "status": "PENDING",
  "role": "PACIENTE",
  "message": "Usuario creado. Código enviado al correo."
}
```

**Error Responses:**

- `400` - User already exists
- `500` - Error sending verification email

---

## 6. Update User

Updates an existing user's information.

**Endpoint:** `PUT /users/:id`

**Auth Required:** `ADMINISTRADOR`

**URL Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| id | string | Yes | User MongoDB ObjectId |

**Request Body (all fields optional):**

```json
{
  "email": "newemail@example.com",
  "fullname": "Juan Pérez Updated",
  "phone": "+9876543210",
  "date_of_birth": "1990-05-15"
}
```

**Success Response (200):**

```json
{
  "message": "User updated successfully",
  "user": {
    "id": "507f1f77bcf86cd799439011",
    "email": "newemail@example.com",
    "fullname": "Juan Pérez Updated",
    "role": "PACIENTE",
    "status": "ACTIVE"
  }
}
```

**Error Response (404):**

```json
{
  "error": "User not found"
}
```

---

## 7. Delete User (Soft Delete)

Deactivates a user by setting their status to INACTIVE.

**Endpoint:** `DELETE /users/:id`

**Auth Required:** `ADMINISTRADOR`

**URL Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| id | string | Yes | User MongoDB ObjectId |

**Success Response (200):**

```json
{
  "message": "User deactivated successfully"
}
```

**Error Response (404):**

```json
{
  "error": "User not found"
}
```

---

## 8. Get User Statistics

Retrieves statistics about all users in the system.

**Endpoint:** `GET /users/stats`

**Auth Required:** `ADMINISTRADOR`

**Success Response (200):**

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
    { "role": "PACIENTE", "count": 70 },
    { "role": "ADMINISTRADOR", "count": 10 }
  ]
}
```

---

## 9. Bulk Import Users

Imports multiple users from a CSV file. **Supports all user types: MEDICO, ENFERMERA, PACIENTE, ADMINISTRADOR.**

**Endpoint:** `POST /users/bulkUsers`

**Auth Required:** `ADMINISTRADOR`

**Content-Type:** `multipart/form-data`

**Form Data:**
| Field           | Type | Required | Description                                 |
|-----------------|------|----------|---------------------------------------------|
| file \| document | File | Yes      | CSV file with user data (UTF-8/UTF-16 supported) |

**CSV Format for Patients:**

```csv
email,fullname,current_password,date_of_birth,phone,role
patient1@example.com,Juan Pérez,Password123,1990-05-15,+1234567890,PACIENTE
patient2@example.com,María García,Password456,1985-03-20,+9876543210,PACIENTE
```

**CSV Format for Doctors:**

```csv
email,fullname,current_password,date_of_birth,phone,role,specialization,department,license_number
doctor1@example.com,Dr. Juan López,Password123,1980-05-15,+1234567890,MEDICO,Cardiología,Medicina Interna,12345
doctor2@example.com,Dra. Ana Pérez,Password456,1975-08-20,+9876543210,MEDICO,Pediatría,Pediatría General,67890
```

**CSV Format for Nurses:**

```csv
email,fullname,current_password,date_of_birth,phone,role,department
nurse1@example.com,María Gómez,Password123,1985-03-15,+1234567890,ENFERMERA,Emergencias
nurse2@example.com,Laura Fernández,Password456,1990-07-20,+9876543210,ENFERMERA,UCI
```

**CSV Format for Administrators:**

```csv
email,fullname,current_password,date_of_birth,phone,role
admin1@example.com,Carlos Ruiz,Password123,1975-01-10,+1234567890,ADMINISTRADOR
```

**Required Fields by Role:**

**PACIENTE:**

- email, fullname, current_password, date_of_birth, role

**MEDICO:**

- email, fullname, current_password, date_of_birth, role, specialization, department, license_number

**ENFERMERA:**

- email, fullname, current_password, date_of_birth, role, department

**ADMINISTRADOR:**

- email, fullname, current_password, date_of_birth, role

**Optional Fields (all roles):**

- phone, status

**Success Response (200):**

```json
{
  "message": "Importación completada",
  "summary": {
    "total": 10,
    "successful": 8,
    "failed": 2
  },
  "results": {
    "successful": [
      {
        "index": 0,
        "patient": {
          "id": "507f1f77bcf86cd799439011",
          "email": "patient1@example.com",
          "fullname": "Juan Pérez",
          "role": "PACIENTE",
          "status": "PENDING"
        }
      }
    ],
    "failed": [
      {
        "index": 5,
        "row": {
          "email": "invalid-email",
          "fullname": "Test User"
        },
        "error": "Invalid email"
      }
    ],
    "total": 10
  }
}
```

**Notes:**

- Each row is validated according to the role specified
- Verification emails are sent to all successfully created users
- Failed imports include the row index and error details
- If email sending fails, the user is deleted and marked as failed
- All passwords are hashed before storage
- Age is automatically calculated from date_of_birth

---

# Doctors Endpoints

Base URL: `/users/doctors`

## 1. Get All Doctors

Retrieves a paginated list of all doctors with optional filters.

**Endpoint:** `GET /users/doctors`

**Auth Required:** `ADMINISTRADOR`, `MEDICO`, `ENFERMERA`

**Query Parameters:**
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| status | string | No | - | Filter by status: `PENDING`, `ACTIVE`, `INACTIVE` |
| page | number | No | 1 | Page number (min: 1) |
| limit | number | No | 10 | Items per page (max: 100) |

**Example Request:**

```bash
GET /users/doctors?status=ACTIVE&page=1&limit=20
```

**Success Response (200):**

```json
{
  "users": [
    {
      "id": "507f1f77bcf86cd799439011",
      "email": "doctor@example.com",
      "fullname": "Dr. Juan Pérez",
      "role": "MEDICO",
      "specialization": "Cardiología",
      "department": "Medicina Interna",
      "license_number": "12345",
      "date_of_birth": "1980-05-15T00:00:00.000Z",
      "age": 43,
      "phone": "+1234567890",
      "status": "ACTIVE",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  ],
  "pagination": {
    "total": 30,
    "page": 1,
    "limit": 20,
    "totalPages": 2
  }
}
```

---

## 2. Create Doctor

Creates a new doctor user.

**Endpoint:** `POST /users/doctors`

**Auth Required:** `ADMINISTRADOR`

**Request Body:**

```json
{
  "email": "doctor@example.com",
  "current_password": "Password123",
  "fullname": "Dr. Juan Pérez",
  "phone": "+1234567890",
  "date_of_birth": "1980-05-15",
  "specialization": "Cardiología",
  "department": "Medicina Interna",
  "license_number": "12345"
}
```

**Required Fields:**

- `email` (email format)
- `current_password` (min 6 chars, must contain at least one number)
- `fullname` (only letters and spaces)
- `date_of_birth` (ISO date format)
- `specialization` (string)
- `department` (string)
- `license_number` (string)

**Optional Fields:**

- `phone` (string)
- `status` (default: `PENDING`)

**Success Response (201):**

```json
{
  "id": "507f1f77bcf86cd799439011",
  "email": "doctor@example.com",
  "fullname": "Dr. Juan Pérez",
  "status": "PENDING",
  "role": "MEDICO",
  "message": "Doctor creado. Código enviado al correo."
}
```

**Error Responses:**

- `400` - User already exists
- `500` - Error sending verification email

---

## 3. Get Doctor By ID

Retrieves a single doctor by their ID.

**Endpoint:** `GET /users/doctors/:id`

**Auth Required:** `ADMINISTRADOR`, `MEDICO`, `ENFERMERA`

**URL Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| id | string | Yes | Doctor MongoDB ObjectId |

**Success Response (200):**

```json
{
  "id": "507f1f77bcf86cd799439011",
  "email": "doctor@example.com",
  "fullname": "Dr. Juan Pérez",
  "role": "MEDICO",
  "specialization": "Cardiología",
  "department": "Medicina Interna",
  "license_number": "12345",
  "date_of_birth": "1980-05-15T00:00:00.000Z",
  "age": 43,
  "phone": "+1234567890",
  "status": "ACTIVE",
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

**Error Responses:**

- `400` - Doctor ID is required
- `404` - Doctor not found

---

## 4. Update Doctor

Updates an existing doctor's information.

**Endpoint:** `PUT /users/doctors/:id`

**Auth Required:** `ADMINISTRADOR`

**URL Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| id | string | Yes | Doctor MongoDB ObjectId |

**Request Body (all fields optional):**

```json
{
  "email": "newemail@example.com",
  "fullname": "Dr. Juan Pérez Updated",
  "phone": "+9876543210",
  "specialization": "Pediatría",
  "department": "Pediatría General",
  "license_number": "54321"
}
```

**Success Response (200):**

```json
{
  "updatedDoctor": {
    "id": "507f1f77bcf86cd799439011",
    "email": "newemail@example.com",
    "fullname": "Dr. Juan Pérez Updated",
    "role": "MEDICO",
    "specialization": "Pediatría",
    "department": "Pediatría General",
    "license_number": "54321",
    "status": "ACTIVE"
  },
  "message": "Doctor updated successfully"
}
```

**Error Responses:**

- `400` - Doctor ID is required
- `404` - Doctor not found

---

## 5. Update Doctor Status

Updates a doctor's status (PENDING, ACTIVE, INACTIVE).

**Endpoint:** `PATCH /users/doctors/status/:id`

**Auth Required:** `ADMINISTRADOR`

**URL Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| id | string | Yes | Doctor MongoDB ObjectId |

**Request Body:**

```json
{
  "status": "ACTIVE"
}
```

**Valid Status Values:**

- `PENDING`
- `ACTIVE`
- `INACTIVE`

**Success Response (200):**

```json
{
  "updatedDoctor": {
    "id": "507f1f77bcf86cd799439011",
    "email": "doctor@example.com",
    "fullname": "Dr. Juan Pérez",
    "role": "MEDICO",
    "status": "ACTIVE"
  },
  "message": "Doctor status updated successfully"
}
```

**Error Responses:**

- `400` - Doctor ID is required
- `404` - Doctor not found

---

# Nurses Endpoints

Base URL: `/users/nurses`

## 1. Create Nurse

Creates a new nurse user.

**Endpoint:** `POST /users/nurses`

**Auth Required:** `ADMINISTRADOR`

**Request Body:**

```json
{
  "email": "nurse@example.com",
  "current_password": "Password123",
  "fullname": "María García",
  "phone": "+1234567890",
  "date_of_birth": "1985-03-20",
  "department": "Emergencias"
}
```

**Required Fields:**

- `email` (email format)
- `current_password` (min 6 chars, must contain at least one number)
- `fullname` (only letters and spaces)
- `date_of_birth` (ISO date format)
- `department` (string)

**Optional Fields:**

- `phone` (string)
- `status` (default: `PENDING`)

**Success Response (201):**

```json
{
  "id": "507f1f77bcf86cd799439011",
  "email": "nurse@example.com",
  "fullname": "María García",
  "status": "PENDING",
  "role": "ENFERMERA",
  "message": "Nurse created. Verification code sent to email."
}
```

**Error Responses:**

- `400` - User already exists
- `500` - Error sending verification email

---

## 2. Get Nurse By ID

Retrieves a single nurse by their ID.

**Endpoint:** `GET /users/nurses/:id`

**Auth Required:** `ADMINISTRADOR`, `MEDICO`, `ENFERMERA`

**URL Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| id | string | Yes | Nurse MongoDB ObjectId |

**Success Response (200):**

```json
{
  "id": "507f1f77bcf86cd799439011",
  "email": "nurse@example.com",
  "fullname": "María García",
  "role": "ENFERMERA",
  "department": "Emergencias",
  "date_of_birth": "1985-03-20T00:00:00.000Z",
  "age": 38,
  "phone": "+1234567890",
  "status": "ACTIVE",
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

**Error Responses:**

- `400` - Nurse ID is required
- `404` - Nurse not found

---

## 3. Update Nurse

Updates an existing nurse's information.

**Endpoint:** `PUT /users/nurses/:id`

**Auth Required:** `ADMINISTRADOR`

**URL Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| id | string | Yes | Nurse MongoDB ObjectId |

**Request Body (all fields optional):**

```json
{
  "email": "newemail@example.com",
  "fullname": "María García Updated",
  "phone": "+9876543210",
  "department": "UCI"
}
```

**Success Response (200):**

```json
{
  "updatedNurse": {
    "id": "507f1f77bcf86cd799439011",
    "email": "newemail@example.com",
    "fullname": "María García Updated",
    "role": "ENFERMERA",
    "department": "UCI",
    "status": "ACTIVE"
  },
  "message": "Nurse updated successfully"
}
```

**Error Responses:**

- `400` - Nurse ID is required
- `404` - Nurse not found

---

## 4. Update Nurse Status

Updates a nurse's status (PENDING, ACTIVE, INACTIVE).

**Endpoint:** `PATCH /users/nurses/status/:id`

**Auth Required:** `ADMINISTRADOR`

**URL Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| id | string | Yes | Nurse MongoDB ObjectId |

**Request Body:**

```json
{
  "status": "ACTIVE"
}
```

**Valid Status Values:**

- `PENDING`
- `ACTIVE`
- `INACTIVE`

**Success Response (200):**

```json
{
  "updatedNurse": {
    "id": "507f1f77bcf86cd799439011",
    "email": "nurse@example.com",
    "fullname": "María García",
    "role": "ENFERMERA",
    "status": "ACTIVE"
  },
  "message": "Nurse status updated successfully"
}
```

**Error Responses:**

- `400` - Nurse ID is required
- `404` - Nurse not found

---

# Common Error Responses

## Validation Errors (400)

```json
{
  "error": "Validation failed",
  "issues": [
    {
      "code": "invalid_type",
      "expected": "string",
      "received": "undefined",
      "path": ["email"],
      "message": "Required"
    }
  ]
}
```

## Authentication Error (401)

```json
{
  "error": "Unauthorized",
  "message": "No token provided"
}
```

## Authorization Error (403)

```json
{
  "error": "Forbidden",
  "message": "You don't have permission to access this resource"
}
```

## Not Found Error (404)

```json
{
  "error": "Resource not found"
}
```

## Server Error (500)

```json
{
  "error": "Internal server error",
  "message": "An unexpected error occurred"
}
```

---

# Data Models

## User Roles

- `MEDICO` - Doctor
- `ENFERMERA` - Nurse
- `PACIENTE` - Patient
- `ADMINISTRADOR` - Administrator

## User Status

- `PENDING` - Awaiting verification
- `ACTIVE` - Active user
- `INACTIVE` - Deactivated user

## Doctor Fields

```typescript
{
  id: string;
  email: string;
  fullname: string;
  role: "MEDICO";
  specialization: string;      // e.g., "Cardiología", "Pediatría"
  department: string;          // e.g., "Medicina Interna"
  license_number: string;      // Medical license number
  date_of_birth: Date;
  age: number;                 // Auto-calculated
  phone?: string;
  status: "PENDING" | "ACTIVE" | "INACTIVE";
  createdAt: Date;
  updatedAt: Date;
}
```

## Nurse Fields

```typescript
{
  id: string;
  email: string;
  fullname: string;
  role: "ENFERMERA";
  department: string;          // e.g., "Emergencias", "UCI"
  date_of_birth: Date;
  age: number;                 // Auto-calculated
  phone?: string;
  status: "PENDING" | "ACTIVE" | "INACTIVE";
  createdAt: Date;
  updatedAt: Date;
}
```

## Patient Fields

```typescript
{
  id: string;
  email: string;
  fullname: string;
  role: "PACIENTE";
  date_of_birth: Date;
  age: number;                 // Auto-calculated
  phone?: string;
  status: "PENDING" | "ACTIVE" | "INACTIVE";
  createdAt: Date;
  updatedAt: Date;
}
```

## Administrator Fields

```typescript
{
  id: string;
  email: string;
  fullname: string;
  role: "ADMINISTRADOR";
  date_of_birth: Date;
  age: number;                 // Auto-calculated
  phone?: string;
  status: "PENDING" | "ACTIVE" | "INACTIVE";
  createdAt: Date;
  updatedAt: Date;
}
```

---

# Routes Summary

## Users Routes (`/users`)

| Method | Endpoint              | Auth                     | Description                  |
| ------ | --------------------- | ------------------------ | ---------------------------- |
| GET    | `/users/by-role`      | ADMINISTRADOR            | Get users by role (required) |
| GET    | `/users/by-specialty` | ADMINISTRADOR            | Get doctors by specialty     |
| GET    | `/users`              | ADMINISTRADOR            | Get all users                |
| GET    | `/users/:id`          | ADMIN, MEDICO, ENFERMERA | Get user by ID               |
| POST   | `/users`              | ADMINISTRADOR            | Create patient               |
| PUT    | `/users/:id`          | ADMINISTRADOR            | Update user                  |
| DELETE | `/users/:id`          | ADMINISTRADOR            | Soft delete user             |
| GET    | `/users/stats`        | ADMINISTRADOR            | Get statistics               |
| POST   | `/users/bulkUsers`    | ADMINISTRADOR            | Bulk import (all types)      |

## Doctors Routes (`/users/doctors`)

| Method | Endpoint                    | Auth                     | Description          |
| ------ | --------------------------- | ------------------------ | -------------------- |
| GET    | `/users/doctors`            | ADMIN, MEDICO, ENFERMERA | Get all doctors      |
| POST   | `/users/doctors`            | ADMINISTRADOR            | Create doctor        |
| GET    | `/users/doctors/:id`        | ADMIN, MEDICO, ENFERMERA | Get doctor by ID     |
| PUT    | `/users/doctors/:id`        | ADMINISTRADOR            | Update doctor        |
| PATCH  | `/users/doctors/status/:id` | ADMINISTRADOR            | Update doctor status |

## Nurses Routes (`/users/nurses`)

| Method | Endpoint                   | Auth                     | Description         |
| ------ | -------------------------- | ------------------------ | ------------------- |
| POST   | `/users/nurses`            | ADMINISTRADOR            | Create nurse        |
| GET    | `/users/nurses/:id`        | ADMIN, MEDICO, ENFERMERA | Get nurse by ID     |
| PUT    | `/users/nurses/:id`        | ADMINISTRADOR            | Update nurse        |
| PATCH  | `/users/nurses/status/:id` | ADMINISTRADOR            | Update nurse status |

---

# Notes

1. **Password Requirements:**

   - Minimum 6 characters
   - Must contain at least one number

2. **Name Validation:**

   - Only letters (including Spanish characters: á, é, í, ó, ú, ñ)
   - Spaces allowed

3. **Age Calculation:**

   - Automatically calculated from `date_of_birth`
   - Must be between 1 and 100

4. **Verification Email:**

   - Sent automatically upon user creation
   - Code expires in 24 hours (for bulk imports)
   - Code expires in 15 minutes (for single user creation)

5. **Pagination:**

   - Default page: 1
   - Default limit: 10
   - Maximum limit: 100

6. **Soft Delete:**

   - Users are never permanently deleted
   - DELETE endpoint sets status to `INACTIVE`

7. **Bulk Import:**

   - Supports all user types: PACIENTE, MEDICO, ENFERMERA, ADMINISTRADOR
   - CSV must include `role` column to specify user type
   - Each role requires different fields
   - Failed imports don't stop the process
   - Validation errors are reported per row

8. **Specialization Filter:**

   - Only available for doctors (role: MEDICO)
   - Case-insensitive
   - Partial match supported (e.g., "cardio" matches "Cardiología")

9. **Route Order:**
   - Specific routes (`/users/doctors`, `/users/nurses`) are registered before generic `/users` routes
   - This prevents path conflicts and ensures correct routing
