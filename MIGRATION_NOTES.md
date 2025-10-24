# Notas de Migración - Consolidación de Microservicios

## Resumen

Se ha refactorizado completamente el microservicio `medcore-users` para:

1. Adaptarlo a la nueva arquitectura Prisma con tipos compuestos (embedded documents)
2. Consolidar toda la funcionalidad de `medcore-patients` en un único microservicio

## Cambios en el Schema de Prisma

### Modelo Users Actualizado

- **Campo obligatorio añadido**: `documentNumber` (String unique)
- **Campo base añadido**: `gender` (String opcional)
- **Tipos compuestos embebidos** según rol:
  - `medico`: { especialtyId, license_number }
  - `enfermera`: { departmentId }
  - `paciente`: { gender, address? }
  - `administrador`: { nivelAcceso?, departamentoAsignado? }

### Nuevos Modelos

- **Department**: Departamentos hospitalarios con relación a Especialty
- **Especialty**: Especialidades médicas vinculadas a Departments

## Cambios en Schemas de Validación (Zod)

### Schemas Actualizados

- `baseUser`: Ahora incluye `documentNumber` (obligatorio) y `gender` (opcional)
- `date_of_birth`: Cambiado de `z.iso.date()` a `z.coerce.date()` para mejor parsing
- `validateAge`: Límite superior aumentado de 100 a 120 años

### Nuevos Schemas

- `datosMedicoSchema`: Validación para datos embebidos de médicos
- `datosEnfermeraSchema`: Validación para datos embebidos de enfermeras
- `datosPacienteSchema`: Validación para datos embebidos de pacientes
- `datosAdministradorSchema`: Validación para datos embebidos de administradores
- `advancedSearchSchema`: Búsqueda avanzada de pacientes (migrado de patients)

### Schemas por Rol Actualizados

- `medicoSchema`: Ahora usa campo embebido `medico` en lugar de campos planos
- `enfermeraSchema`: Ahora usa campo embebido `enfermera`
- `pacienteSchema`: Campo `gender` obligatorio + campo embebido `paciente` opcional
- `administradorSchema`: Campo embebido `administrador` opcional

## Cambios en el Servicio (users.service.ts)

### Nuevas Funciones

- `checkDocumentExists()`: Verifica duplicidad de números de documento
- `searchPatientsAdvanced()`: Búsqueda avanzada de pacientes con múltiples filtros
- `getPatientById()`: Obtiene un paciente específico (solo role PACIENTE)

### Funciones Actualizadas

- `getAllUsers()`: Soporte para filtrar por `especialtyId` y `gender`
- `createUser()`:
  - Validación de `documentNumber` duplicado
  - Manejo de campos embebidos según rol
  - Validación de género para pacientes
- `updateUser()`: Manejo inteligente de campos embebidos según rol del usuario

## Cambios en el Controller (users.controller.ts)

### Nuevos Endpoints (Migrados de Patients)

1. **POST /api/users/patients** - Crear paciente
2. **GET /api/users/patients** - Listar pacientes
3. **GET /api/users/patients/search/advanced** - Búsqueda avanzada
4. **GET /api/users/patients/:id** - Obtener paciente por ID
5. **PUT /api/users/patients/:id** - Actualizar paciente completo
6. **PATCH /api/users/patients/:id/state** - Actualizar estado de paciente

### Funciones del Controller Actualizadas

- `create()`: Manejo del error de documento duplicado
- `getUsersBySpecialty()`: Cambio de `specialty` a `especialtyId`

## Cambios en Rutas (users.routes.ts)

### Nueva Organización

Las rutas ahora están organizadas en dos secciones:

1. **Rutas Generales de Usuarios**: endpoints existentes
2. **Rutas Específicas para Pacientes**: endpoints migrados de patients

### Nota Importante sobre Orden de Rutas

La ruta `/patients/search/advanced` **debe** ir antes de `/patients/:id` para evitar conflictos de matching.

## Endpoints Disponibles

### Usuarios Generales

- `GET /api/users/by-role` - Filtrar por rol
- `GET /api/users/by-specialty` - Filtrar médicos por especialidad
- `GET /api/users/stats` - Estadísticas de usuarios
- `GET /api/users` - Listar todos
- `GET /api/users/:id` - Obtener por ID
- `POST /api/users` - Crear usuario
- `PUT /api/users/:id` - Actualizar usuario
- `DELETE /api/users/:id` - Desactivar usuario
- `POST /api/users/bulkUsers` - Importación masiva CSV

### Pacientes (Nuevos)

- `POST /api/users/patients` - Crear paciente
- `GET /api/users/patients` - Listar pacientes
- `GET /api/users/patients/search/advanced` - Búsqueda avanzada
- `GET /api/users/patients/:id` - Obtener paciente
- `PUT /api/users/patients/:id` - Actualizar paciente
- `PATCH /api/users/patients/:id/state` - Actualizar estado

## Búsqueda Avanzada de Pacientes

### Parámetros Disponibles

- `documentNumber`: Búsqueda exacta por número de documento
- `gender`: Filtrar por género
- `address`: Búsqueda parcial case-insensitive en dirección
- `dateFrom`: Fecha inicio (creación del registro)
- `dateTo`: Fecha fin (creación del registro)
- `page`: Número de página (default: 1)
- `limit`: Registros por página (default: 10, max: 100)

### Ejemplo de Uso

```
GET /api/users/patients/search/advanced?gender=M&dateFrom=2024-01-01&dateTo=2024-12-31&page=1&limit=20
```

## Permisos por Rol

### ADMINISTRADOR

- Acceso completo a todos los endpoints de usuarios y pacientes

### MEDICO y ENFERMERA

- Lectura de usuarios: `/api/users/:id`
- Lectura de pacientes: todos los endpoints GET de `/api/users/patients`

### PACIENTE

- Sin acceso a estos endpoints (solo a su propio perfil via otros microservicios)

## Migración de Datos

### Pasos Recomendados

1. **Backup de la base de datos**

   ```bash
   # Exportar colección actual
   mongoexport --uri="<DATABASE_URL>" --collection=users --out=users_backup.json
   ```

2. **Regenerar Prisma Client**

   ```bash
   cd medcore-users
   npx prisma generate
   ```

3. **Script de Migración de Datos** (sugerido)

   - Los usuarios existentes sin `documentNumber` necesitarán uno asignado
   - Convertir campos planos (`specialization`, `department`, `license_number`) a campos embebidos
   - Pacientes en colección separada deberán ser migrados a `Users` con `role: PACIENTE`

4. **Validación Post-Migración**
   - Verificar que todos los usuarios tienen `documentNumber`
   - Confirmar que campos embebidos están correctamente poblados según rol
   - Probar endpoints de búsqueda avanzada

## Compatibilidad hacia Atrás

### ⚠️ Breaking Changes

1. Campo `documentNumber` ahora es **obligatorio**
2. Campo `specialization` movido a `medico.especialtyId` (requiere ObjectId)
3. Campo `department` para enfermeras movido a `enfermera.departmentId` (requiere ObjectId)
4. Campo `license_number` movido a `medico.license_number`
5. Cambio de `specialty` a `especialtyId` en query params

### Rutas Deprecadas

Los siguientes endpoints de `medcore-patients` ahora están en `medcore-users`:

- `POST /api/patients` → `POST /api/users/patients`
- `GET /api/patients` → `GET /api/users/patients`
- `GET /api/patients/search/advanced` → `GET /api/users/patients/search/advanced`
- `GET /api/patients/:id` → `GET /api/users/patients/:id`
- `PUT /api/patients/:id` → `PUT /api/users/patients/:id`
- `PATCH /api/patients/:id/state` → `PATCH /api/users/patients/:id/state`

## Próximos Pasos

1. **Actualizar Frontend**:

   - Cambiar llamadas de `medcore-patients` a `medcore-users/patients`
   - Añadir campo `documentNumber` en formularios
   - Actualizar formularios de médicos/enfermeras para usar IDs de Department/Especialty

2. **Crear Endpoints de Department y Especialty**:

   - CRUD para gestión de departamentos
   - CRUD para gestión de especialidades
   - Endpoints de consulta para poblar dropdowns en frontend

3. **Script de Migración**:

   - Crear script para migrar datos existentes al nuevo formato
   - Generar `documentNumber` para usuarios que no lo tengan
   - Convertir datos planos a embebidos

4. **Tests**:

   - Actualizar tests existentes para nueva estructura
   - Añadir tests para endpoints de pacientes
   - Tests de validación de campos embebidos

5. **Deprecar medcore-patients**:
   - Una vez validado todo, marcar microservicio de patients como deprecado
   - Actualizar documentación y README
   - Eventualmente eliminar el microservicio

## Ejemplo de Uso - Crear Médico

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

## Ejemplo de Uso - Crear Paciente

```json
POST /api/users/patients
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

## Notas Técnicas

### Tipos Compuestos en Prisma (MongoDB)

Los tipos compuestos (`type`) en Prisma con MongoDB se almacenan como documentos embebidos. Para queries:

- Usar `is` para filtrar por campos embebidos
- Ejemplo: `{ medico: { is: { especialtyId: "..." } } }`

### Validación de Edad

- Mínimo: 1 año
- Máximo: 120 años
- Se calcula automáticamente desde `date_of_birth`

### Códigos de Error HTTP

| Código | Descripción                                 |
| ------ | ------------------------------------------- |
| 400    | Bad Request - Validación fallida            |
| 401    | Unauthorized - Token inválido o expirado    |
| 403    | Forbidden - Permisos insuficientes          |
| 404    | Not Found - Recurso no encontrado           |
| 409    | Conflict - Email o documentNumber duplicado |
| 500    | Internal Server Error                       |

## Contacto y Soporte

Para dudas o issues relacionados con esta migración, contactar al equipo de desarrollo.

---

**Fecha de Migración**: 24 de octubre de 2025  
**Versión**: 2.0.0  
**Autor**: Carlos Gómez (con asistencia de GitHub Copilot)
