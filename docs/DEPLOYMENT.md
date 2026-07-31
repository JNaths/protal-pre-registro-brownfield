<!-- generated-by: gsd-doc-writer -->

# Deployment

This document describes how to build and deploy the Portal de Pre-registro de Pacientes to production. The system consists of two components: a React single-page application (frontend) and a Node.js/Express API server (backend), both backed by a PostgreSQL database.

## Deployment Targets

The repository currently includes only local development database provisioning via Docker Compose. No CI/CD, hosting, or process management configuration is present in the repository.

- **Docker Compose (local development only)**: `docker-compose.yml` provisions PostgreSQL 16-alpine for local development. This is not suitable for production use.

For production deployment, you must:

<!-- VERIFY: Target hosting platform (AWS, Google Cloud, Azure, DigitalOcean, Heroku, Vercel, Railway, Fly.io, etc.) and configuration method (Dockerfile, buildpacks, IaC, etc.) -->

<!-- VERIFY: Process manager or container orchestration (systemd, PM2, Kubernetes, Docker Swarm, etc.) -->

<!-- VERIFY: TLS/HTTPS configuration and certificate management strategy -->

## Build Pipeline

### Building Workspaces for Production

The monorepo uses npm workspaces. Build all workspaces from the root:

```bash
npm install
npm run build
```

This command executes the `build` script in each workspace's `package.json`:

- **packages/api**: Compiles TypeScript via `tsc -b`, producing `packages/api/dist/` with the entry point `dist/index.js`
- **packages/web**: Compiles TypeScript via `tsc -b`, then bundles the React SPA via `vite build`, producing `packages/web/dist/` with static assets and `index.html`

### Build Scripts by Package

| Package | Command | Output | Description |
|---------|---------|--------|-------------|
| packages/api | `tsc -b` | `dist/index.js` | Compiles TypeScript to CommonJS (type: "module" in package.json). Entry point for Express server. |
| packages/web | `tsc -b && vite build` | `dist/` | Compiles TypeScript, bundles React SPA with Vite, outputs HTML + CSS + JS assets. |

## Environment Setup for Production

Refer to the complete environment variable documentation in [CONFIGURATION.md](./CONFIGURATION.md). For production deployments, you must set:

### Required Variables

- **`DATABASE_URL`** (required): PostgreSQL connection string with pooled endpoint. Format: `postgresql://user:password@host:port/database?sslmode=require&channel_binding=require`. <!-- VERIFY: Production Neon (or other cloud database) pooled endpoint URL, credentials, and SSL/channel binding parameters -->

- **`DIRECT_URL`** (required): PostgreSQL connection string with direct (non-pooled) endpoint, used exclusively for Prisma migrations. Same format as `DATABASE_URL` but pointing to the direct connection. <!-- VERIFY: Production Neon direct endpoint URL and credentials -->

### Optional Variables

- **`PORT`** (optional): HTTP port the API server listens on. Defaults to `3000`. Set this only if your deployment platform requires a specific port.

These variables must be set in your deployment platform's secret manager or environment configuration before the application starts.

## Database Migrations on Deploy

Prisma migrations must run **before** the API server starts.

### Running Migrations

```bash
npx prisma migrate deploy --schema=prisma/schema.prisma
```

This command:
- Uses `DIRECT_URL` (non-pooled connection) to execute pending migrations
- Is idempotent — safe to run multiple times
- Must complete successfully before starting the API server

### Configuration Details

The Prisma configuration in `prisma.config.ts` defines:

- **DATABASE_URL**: Pooled connection used by `PrismaClient` at runtime via the `@prisma/adapter-pg` driver adapter
- **DIRECT_URL**: Direct connection used exclusively by `prisma migrate deploy` because cloud database poolers (e.g., Neon's PgBouncer) do not support the session-level transaction management required by DDL statements

If using Neon PostgreSQL, you must provide both URLs — the pooled endpoint (for runtime) and the direct endpoint (for migrations). Mixing endpoints will cause migration failures.

## Running the API Server

After building and running migrations, start the Express API:

```bash
cd packages/api
node dist/index.js
```

The server will:
- Load environment variables from `.env.local` or deployment platform configuration
- Fail immediately if `DATABASE_URL` is not set
- Listen on the port specified by `PORT` (or `3000` by default)
- Log "API server running on http://localhost:{PORT}" on successful startup
- Expose endpoints:
  - `GET /api/health` — Prisma database connectivity check
  - `POST /api/pre-registros` — Accepts patient pre-registration form submissions

### Expected Startup Output

```
API server running on http://localhost:3000
```

If startup fails with "DATABASE_URL is not set", verify that your deployment platform is passing the required environment variables.

## Serving the Web SPA

After building, the React SPA is located in `packages/web/dist/`. You must serve these static assets from an HTTP server.

### Option 1: Static File Server (Recommended for Separate Frontend/Backend Deployment)

Deploy the contents of `packages/web/dist/` to a static hosting service (<!-- VERIFY: CDN/static hosting platform (Vercel, Netlify, AWS S3 + CloudFront, etc.) -->) and configure it to serve `index.html` for all non-file routes (client-side routing fallback).

For example, nginx configuration:

```nginx
server {
    listen 80;
    server_name _;
    root /var/www/web/dist;
    index index.html;
    
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    location /api {
        proxy_pass http://api-server:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

### Option 2: Same-Server Deployment

If deploying both frontend and backend on the same server, you can serve the SPA static files from the same Node.js process. Add the following middleware to `packages/api/src/index.ts` before route handlers:

```typescript
import path from "node:path";
import { fileURLToPath } from "node:url";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const webDistPath = path.resolve(__dirname, "../../web/dist");

app.use(express.static(webDistPath));
app.get("*", (req, res) => {
  res.sendFile(path.join(webDistPath, "index.html"));
});
```

This approach requires the web SPA to be built and co-located with the API binary on the server.

<!-- VERIFY: Chosen architecture and specific implementation (separated frontend/backend or co-located) -->

## Rollback Procedure

<!-- VERIFY: Rollback strategy and tooling for your chosen deployment platform (container registry tags, cloud platform rollback commands, infrastructure-as-code versioning, etc.) -->

A basic rollback approach:

1. If deployment uses container images:
   - Redeploy the previous stable Docker image tag
   - Ensure the previous image was built and pushed to your container registry

2. If deployment uses code commits:
   - Reset to the previous git commit: `git reset --hard <previous-commit-sha>`
   - Rebuild and redeploy

3. If database migrations introduced breaking changes:
   - Revert the migration with `npx prisma migrate resolve --rolled-back <migration-name>`
   - **Warning**: Only use this if the schema change is backward-compatible with the previous API version; otherwise, coordinate the rollback to include a previous API build as well

## Monitoring and Observability

<!-- VERIFY: Monitoring platform (Sentry, Datadog, New Relic, OpenTelemetry, CloudWatch, etc.), dashboard URLs, alerting strategy -->

Currently, the API logs via `pino` logger (configured in `packages/api/src/utils/logger.ts`). Logs are written to stdout/stderr and available through your deployment platform's logging service (e.g., CloudWatch, Google Cloud Logging, Datadog, ELK stack).

### Key Metrics to Monitor

- **API Health**: `GET /api/health` should return `{ status: "ok" }` if the database is reachable
- **Request Rate**: Monitor `POST /api/pre-registros` request volume and latency
- **Database Connections**: Verify that connection pool utilization stays within limits (especially if using Neon with a limited pooler)
- **Error Rate**: Track 5xx responses and log errors via `pino` logger

### Rate Limiting

The API enforces a rate limit of **20 requests per minute per IP address** using in-memory rate limiting middleware. This limit applies to all routes and is not configurable via environment variables. For production deployments with <!-- VERIFY: expected request volume and geographical distribution -->, you may need to:

- Increase the rate limit threshold (requires code change to `packages/api/src/middleware/rateLimit.ts`)
- Distribute rate limiting across multiple API instances using a shared backend (Redis, memcached) instead of in-memory storage
- Configure a reverse proxy (nginx, HAProxy) or API gateway (AWS API Gateway, Cloudflare, Kong) to handle rate limiting before requests reach the API

## CI/CD Pipeline Configuration

<!-- VERIFY: CI/CD platform (GitHub Actions, GitLab CI, CircleCI, Jenkins, etc.) and pipeline YAML/config location -->

No CI/CD configuration is present in the repository. To set up automated builds and deployments, create a pipeline that:

1. Triggers on push to main branch or tag creation
2. Installs dependencies: `npm install`
3. Runs tests: `npm test`
4. Builds all workspaces: `npm run build`
5. Runs database migrations: `npx prisma migrate deploy`
6. Deploys built artifacts (API binary and web SPA) to production

Example GitHub Actions workflow structure (not present in repo — for reference only):

```yaml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: "20"
      - run: npm install
      - run: npm test
      - run: npm run build
      - run: npx prisma migrate deploy
      - run: # Deploy to production platform
```

<!-- VERIFY: Actual CI/CD platform and pipeline configuration -->
