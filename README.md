<!-- generated-by: gsd-doc-writer -->

# Portal de Pre-registro de Pacientes

Sistema web de dos superficies para pre-registro de pacientes antes de consulta médica: un formulario público multi-paso accesible desde móvil, y una consola autenticada de recepción para validar pre-registros al arribo del paciente.

## Características Principales

- **Formulario de Pre-registro Público**: Asistente por pasos sin login donde el paciente captura datos personales, fiscales, contacto, domicilio, información médica básica y consentimiento explícito (LFPDPPP).
- **Consola de Recepción Autenticada**: Personal de recepción consulta, busca y valida pre-registros al momento del arribo.
- **Sin papel, sin captura manual**: Reducción de tiempo en recepción en ~70% vs. flujo presencial tradicional.

## Estructura del Monorepo

Este proyecto es un monorepo con npm workspaces que contiene tres paquetes principales:

| Paquete | Rol | Stack |
|---------|-----|-------|
| `packages/api` | Backend REST API con gestión de BD | Node.js + Express + Prisma + PostgreSQL |
| `packages/web` | Frontend de pre-registro y consola de recepción | React + TypeScript + Vite + Tailwind v4 + shadcn/ui |
| `packages/validation` | Esquemas Zod compartidos + validación CURP/RFC | TypeScript + Zod |

## Requisitos Previos

- **Node.js**: >= 18.0.0 (versión exacta: ver `.nvmrc` si existe)
- **npm**: >= 11.0.0 (incluido con Node.js)
- **Docker** (opcional, recomendado para base de datos local):
  - Docker Engine y Docker Compose para ejecutar PostgreSQL localmente
  - Alternativamente, tener una base de datos PostgreSQL accesible con la URL en `DATABASE_URL`

## Instalación

1. **Clonar el repositorio:**
   ```bash
   git clone https://github.com/your-org/portal-preregistro.git
   cd portal-preregistro
   ```

2. **Instalar dependencias del monorepo:**
   ```bash
   npm install
   ```

3. **Configurar variables de entorno:**
   ```bash
   cp .env.example .env.local
   ```
   Edita `.env.local` con tus valores locales (por defecto apunta a Docker Compose local).

4. **Iniciar la base de datos PostgreSQL (si usas Docker):**
   ```bash
   npm run docker:up
   ```

5. **Generar cliente Prisma:**
   ```bash
   npm run db:generate
   ```

6. **Ejecutar migraciones de esquema:**
   ```bash
   npm run db:migrate
   ```

## Inicio Rápido

### Ejecutar todos los servicios en desarrollo

```bash
npm run dev
```

Esto inicia simultáneamente:
- **API**: `http://localhost:3000` (Node.js + Express)
- **Web**: `http://localhost:5173` (Vite dev server, React)

### Ejecutar un servicio específico

```bash
# Solo API
npm run dev --workspace=@app/api

# Solo Web
npm run dev --workspace=@app/web
```

### Compilar todos los paquetes

```bash
npm run build
```

## Ejemplos de Uso

### 1. Pre-registro de paciente (API POST)

Endpoint: `POST /api/pre-registros`

**Solicitud:**
```json
{
  "nombre": "Juan",
  "apellidoPaterno": "García",
  "apellidoMaterno": "López",
  "fechaNacimiento": "1990-05-15T00:00:00Z",
  "sexo": "H",
  "curp": "GAGL900515HDFRNN01",
  "rfc": "GAGL900515XXX",
  "email": "juan.garcia@example.com",
  "telefono": "+5551234567",
  "domicilio": {
    "calle": "Avenida Reforma",
    "numero": "505",
    "colonia": "Juárez",
    "codigoPostal": "06500",
    "estado": "CDMX",
    "municipio": "Cuauhtémoc"
  },
  "infoMedica": {
    "tipoSangre": "O+",
    "alergias": "Penicilina",
    "observaciones": "Hipertenso"
  },
  "consentimiento": {
    "aceptado": true
  }
}
```

**Respuesta (éxito):**
```json
{
  "id": 1,
  "createdAt": "2025-07-31T10:30:00Z",
  "consentimiento": {
    "aceptado": true,
    "fechaAceptacion": "2025-07-31T10:30:00Z"
  }
}
```

### 2. Verificar estado de la API

```bash
curl http://localhost:3000/api/health
```

Respuesta esperada:
```json
{
  "status": "ok",
  "database": "connected"
}
```

### 3. Acceder al formulario de pre-registro (Web)

```
http://localhost:5173
```

La interfaz de pre-registro se abre en modo wizard multi-paso.

## Tests

Ejecutar tests en todos los paquetes:
```bash
npm test
```

Ejecutar tests de un paquete específico:
```bash
npm test --workspace=@app/api
npm test --workspace=@app/web
npm test --workspace=@app/validation
```

Ejecutar tests en modo watch (desarrollo) — no hay script `test:watch`; invoca Vitest en watch dentro del paquete:
```bash
npm exec --workspace=@app/api -- vitest
```

## Estructura de Directorios

```
portal-preregistro/
├── packages/
│   ├── api/                   # Backend Express
│   │   ├── src/
│   │   │   ├── index.ts       # Punto de entrada, rutas
│   │   │   ├── routes/        # Controladores (health, pre-registros)
│   │   │   ├── middleware/    # Middleware (rate limiting, etc.)
│   │   │   ├── db/            # Cliente Prisma / acceso a datos
│   │   │   ├── utils/         # Utilidades (logger, sanitización)
│   │   │   └── env.ts         # Carga de variables de entorno
│   │   ├── __tests__/         # Pruebas fuera de src (health)
│   │   └── package.json
│   │
│   ├── web/                   # Frontend React + Vite
│   │   ├── src/
│   │   │   ├── App.tsx        # Componente raíz
│   │   │   ├── main.tsx       # Punto de entrada React
│   │   │   ├── components/    # Componentes UI (wizard, steps, common)
│   │   │   ├── hooks/         # Hooks (usePreRegistroForm)
│   │   │   ├── lib/           # Utilidades (form-utils, step-schemas)
│   │   │   ├── types/         # Tipos compartidos
│   │   │   └── index.css      # Estilos Tailwind
│   │   ├── index.html         # HTML root
│   │   └── package.json
│   │
│   └── validation/            # Esquemas Zod compartidos
│       ├── src/
│       │   ├── index.ts       # Exporta todos los esquemas
│       │   ├── curp.ts        # Validador CURP
│       │   ├── rfc.ts         # Validador RFC
│       │   ├── pre-registro.ts # Esquema de pre-registro
│       │   └── ...
│       └── package.json
│
├── prisma/
│   └── schema.prisma          # Definición de modelos (PreRegistro, Consentimiento, etc.)
│
├── .env.example               # Variables de entorno de referencia
├── docker-compose.yml         # PostgreSQL local (desarrollo)
├── package.json               # Configuración del monorepo
└── README.md
```

## Configuración de Entorno

Las siguientes variables de entorno se espera en `.env.local`:

| Variable | Requerida | Descripción |
|----------|-----------|-------------|
| `DATABASE_URL` | Sí | URL de conexión PostgreSQL. Por defecto apunta a Docker Compose local. |
| `PORT` | No | Puerto en el que corre la API (default: 3000). |

Ejemplo `.env.local` para desarrollo local:
```env
DATABASE_URL=postgresql://portal:portal@localhost:5432/portal_preregistro?schema=public
PORT=3000
```

## Stack Tecnológico

- **Frontend**: React 18, TypeScript, Vite, Tailwind v4, shadcn/ui (Radix UI), React Hook Form
- **Backend**: Node.js, Express 4, Prisma ORM, PostgreSQL (Neon), Pino (logging)
- **Validation**: Zod, validate-curp, validate-rfc
- **Testing**: Vitest, @testing-library/react, supertest
- **Build**: TypeScript compiler, Vite, tsc

## Licencia

Este proyecto es privado. Consulta con el equipo para más información sobre permisos y distribución.
