<!-- generated-by: gsd-doc-writer -->

# Getting Started

This guide walks a new developer through the steps needed to clone, install, configure, and run the Portal de Pre-registro de Pacientes for the first time.

## Prerequisites

Before you begin, ensure your system has the following installed:

| Requirement | Minimum Version | Notes |
|---|---|---|
| **Node.js** | >= 18.0.0 | Check your version with `node --version`. The project targets Node 18+. |
| **npm** | >= 11.0.0 | Included with Node.js; check with `npm --version`. Used for monorepo workspace commands. |
| **Git** | (any recent version) | Required to clone the repository. |
| **Docker** (optional) | Latest stable | Required only if running PostgreSQL locally via docker-compose. If you have a remote PostgreSQL instance (Neon, AWS RDS, etc.), Docker is not required. |

## Installation Steps

Follow these steps in order to clone, install dependencies, and configure the project.

### Step 1: Clone the Repository

```bash
git clone <repository-url>
cd exercise-02
```

Replace `<repository-url>` with the actual repository URL. If cloning via SSH, ensure your SSH key is registered with GitHub.

### Step 2: Install Monorepo Dependencies

Install all dependencies for the root and all workspace packages (api, web, validation):

```bash
npm install
```

This command reads `package.json` workspaces configuration and installs dependencies for:
- `packages/api` (Express backend)
- `packages/web` (React frontend)
- `packages/validation` (Zod schemas)

### Step 3: Configure Environment Variables

Copy the environment template file and edit it with your local configuration:

```bash
cp .env.example .env.local
```

Open `.env.local` in your editor and configure:

```env
# Local PostgreSQL via docker-compose (default)
DATABASE_URL=postgresql://portal:portal@localhost:5432/portal_preregistro?schema=public
PORT=3000
```

**For remote PostgreSQL (Neon, AWS RDS, etc.):**
Replace the `DATABASE_URL` value with your connection string. Contact your team for production/staging connection strings — never commit real credentials.

### Step 4: Start the PostgreSQL Database (if using Docker)

If you do not have a remote PostgreSQL instance, start the local database via docker-compose:

```bash
npm run docker:up
```

This command starts a PostgreSQL 16 container (credentials: user `portal` / password `portal`) and creates the `portal_preregistro` database. The container will persist data in a local volume named `portal_postgres_data` until explicitly removed.

**Verify the database is running:**

```bash
docker ps
```

You should see a `postgres:16-alpine` container listed.

### Step 5: Generate Prisma Client

Generate the Prisma client from the schema:

```bash
npm run db:generate
```

This step reads `prisma/schema.prisma` and generates TypeScript types in `node_modules/.prisma/client` for use by the API. This step must run before the API server can start.

### Step 6: Run Database Migrations

Apply all pending Prisma migrations to your database:

```bash
npm run db:migrate
```

This command:
1. Reads `prisma/schema.prisma`
2. Checks which migrations have been applied to your database
3. Applies any pending migrations (creating tables for PreRegistro, Consentimiento, Domicilio, InfoMedica, PersonalDeRecepcion)
4. Creates a `prisma/migrations/` directory if it does not exist, containing timestamped migration files

If this is your first run, all tables will be created. **Note:** During development, Prisma may prompt you to reset the database after schema changes — follow the prompts.

## First Run

Once installation and configuration are complete, start all development servers:

```bash
npm run dev
```

This command starts:
- **API server** on `http://localhost:3000` (Node.js + Express)
- **Web server** on `http://localhost:5173` (Vite dev server, React)

### Verify the API is Running

In a new terminal, check that the API is healthy:

```bash
curl http://localhost:3000/api/health
```

Expected response:

```json
{
  "status": "ok",
  "database": "connected"
}
```

If you see a database connection error, verify that:
1. Your `DATABASE_URL` in `.env.local` is correct
2. The PostgreSQL container is running (if using Docker: `docker ps`)
3. Database migrations have been applied (`npm run db:migrate`)

### Open the Pre-registro Wizard

In your browser, navigate to:

```
http://localhost:5173
```

You should see the patient pre-registration wizard. Complete the five-step form end-to-end:

1. **Personal Step**: Enter name, surname, date of birth, gender
2. **Contact Step**: Enter CURP, RFC (optional), email, phone
3. **Address Step**: Enter street, neighborhood, postal code, state, municipality
4. **Medical Step**: Enter blood type, allergies, notes
5. **Consent Step**: Accept the privacy notice and submit

### Verify the Pre-registro Was Saved

After submission, check that the record was created by querying the API:

```bash
curl http://localhost:3000/api/pre-registros
```

You should see a JSON array containing your submitted record with fields: `id`, `nombre`, `email`, `createdAt`, `consentimiento` (with `aceptado` and `fechaAceptacion` timestamp).

## Common Setup Issues

### Issue: Node Version Error

**Symptom:** `npm install` fails with "The engine \"node\" is incompatible with this package".

**Solution:** Update Node.js to version 18.0.0 or higher.

```bash
# Check your current version
node --version

# If < 18.0.0, download Node.js >= 18 from https://nodejs.org/
# or use a version manager (nvm, fnm, volta)
```

### Issue: Port Already in Use

**Symptom:** "Address already in use :::3000" or "Address already in use :::5173" when running `npm run dev`.

**Solution:** Either close the process using that port, or change the port in `.env.local`:

```bash
# Change API port in .env.local
PORT=3001

# Restart: npm run dev
```

For the web server (Vite), it will auto-increment to 5174 if 5173 is in use; no configuration needed.

### Issue: Database Connection Failed

**Symptom:** API starts but requests fail with "unable to connect to the database" or migrations fail.

**Causes and solutions:**

- **Docker container not running:** Run `npm run docker:up` and wait ~5 seconds for postgres to be ready.
- **Wrong `DATABASE_URL` in `.env.local`:** Verify the connection string matches the docker-compose service (default: `postgresql://portal:portal@localhost:5432/portal_preregistro?schema=public`).
- **Migrations not applied:** Run `npm run db:migrate` before starting the API.
- **Prisma client not generated:** Run `npm run db:generate` if you see "Cannot find module @prisma/client" errors.

### Issue: Migration Reset During Development

**Symptom:** Prisma prompts "Do you want to reset the database?" after schema changes.

**Solution:** If you are in early development and your test data is not important, reply `y` (yes) to reset the database and apply fresh migrations. For production, use manual migration handling — never auto-reset.

## Next Steps

You now have a working development environment with both frontend and backend running. To contribute code, see:

- **[DEVELOPMENT.md](./DEVELOPMENT.md)** — Build commands, code style, branch conventions, and PR process
- **[TESTING.md](./TESTING.md)** — How to run and write tests for the API and web packages

To understand the system architecture, see:

- **[ARCHITECTURE.md](./ARCHITECTURE.md)** — System design, component diagram, and data flow
- **[CONFIGURATION.md](./CONFIGURATION.md)** — All environment variables and their purpose
