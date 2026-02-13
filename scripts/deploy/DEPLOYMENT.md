# Deployment Guide

This guide covers deploying the Auth0 AI Chatbot to Vercel with proper Auth0 configuration.

## Prerequisites

### Required Tools

```bash
# Vercel CLI
npm i -g vercel

# Auth0 CLI (for tenant management via MCP)
brew install auth0/auth0-cli/auth0
```

### Required Accounts

- Vercel account with project linked
- Auth0 tenant with Token Vault enabled
- PostgreSQL database (e.g., Vercel Postgres, Neon, Supabase)

## Environment Files

This project uses three environment files for different contexts:

| File              | Purpose              | Used By                      |
| ----------------- | -------------------- | ---------------------------- |
| `.env.local`      | Local development    | `npm run dev`                |
| `.env.vercel`     | Shared Vercel config | Preview & Production deploys |
| `.env.production` | Production overrides | Production deploy only       |

### File Layering

```
preview     → .env.vercel
production  → .env.vercel + .env.production (overlay)
```

### Example: .env.local (local development)

```bash
# Local database
DATABASE_URL="postgresql://localhost:5432/chatbot"

# Dev Auth0 app
AUTH0_DOMAIN="dev-tenant.us.auth0.com"
AUTH0_CLIENT_ID="dev-client-id"
AUTH0_CLIENT_SECRET="dev-secret"
AUTH0_SECRET="local-session-secret"
AUTH0_ISSUER_BASE_URL="https://dev-tenant.us.auth0.com"
AUTH0_CLIENT_ID_MGMT="mgmt-client-id"
AUTH0_CLIENT_SECRET_MGMT="mgmt-secret"
APP_BASE_URL="http://localhost:3000"

# Shared values
OPENAI_API_KEY="sk-..."
OPENAI_MODEL="gpt-4o-mini"
ENABLED_CONNECTIONS='{"google-oauth2":"con_xxx"}'
```

### Example: .env.vercel (shared Vercel config)

```bash
# Vercel database (same for preview and production)
DATABASE_URL="postgres://vercel-pool.../chatbot"

# Dev Auth0 app (used for preview deployments)
AUTH0_DOMAIN="dev-tenant.us.auth0.com"
AUTH0_CLIENT_ID="dev-client-id"
AUTH0_CLIENT_SECRET="dev-secret"
AUTH0_SECRET="vercel-session-secret"
AUTH0_ISSUER_BASE_URL="https://dev-tenant.us.auth0.com"
AUTH0_CLIENT_ID_MGMT="mgmt-client-id"
AUTH0_CLIENT_SECRET_MGMT="mgmt-secret"
APP_BASE_URL="https://preview.example.com"

# Shared values
OPENAI_API_KEY="sk-..."
OPENAI_MODEL="gpt-4o-mini"
ENABLED_CONNECTIONS='{"google-oauth2":"con_xxx"}'
```

### Example: .env.production (production overrides only)

```bash
# Production Auth0 app (overrides .env.vercel values)
AUTH0_DOMAIN="prod-tenant.us.auth0.com"
AUTH0_CLIENT_ID="prod-client-id"
AUTH0_CLIENT_SECRET="prod-secret"
AUTH0_SECRET="prod-session-secret"
AUTH0_ISSUER_BASE_URL="https://prod-tenant.us.auth0.com"
APP_BASE_URL="https://chatbot.example.com"
```

## One-Time Setup

### 1. Auth0 CLI Authentication

Authenticate the Auth0 CLI so Claude can manage your tenant via MCP:

```bash
# Login to Auth0 CLI
auth0 login

# Verify connection
auth0 tenants list
```

This enables the MCP server in `.mcp.json` to read/write Auth0 configuration.

### 2. Vercel Project Setup

```bash
# Link to existing Vercel project (if not already done)
vercel link

# Or create new project
vercel
```

### 3. Database Setup

Ensure your production database is ready:

```bash
# Apply migrations to production database
DATABASE_URL="your-prod-db-url" npm run prisma:migrate
```

## Database Schema Changes

When modifying the database schema, you **must** create migration files for changes to be deployed to Vercel.

### Important: `migrate dev` vs `db push`

| Command                  | Creates Migration | Use Case                              |
| ------------------------ | ----------------- | ------------------------------------- |
| `npm run prisma:migrate` | ✅ Yes            | **Always use for deployable changes** |
| `npm run prisma:push`    | ❌ No             | Local prototyping only                |

### Why This Matters

Vercel runs `prisma migrate deploy` during builds, which **only applies existing migration files**. If you use `prisma db push`:

- Your local database gets updated ✅
- No migration file is created ❌
- Vercel deployment has nothing to apply ❌
- Production database is missing the changes ❌

### Correct Workflow for Schema Changes

1. **Modify the schema:**

   ```bash
   # Edit prisma/schema.prisma
   ```

2. **Create and apply migration:**

   ```bash
   npm run prisma:migrate -- --name descriptive_name
   ```

3. **Commit the migration file:**

   ```bash
   git add prisma/migrations/
   git commit -m "fix(db): add migration for new_table"
   ```

4. **Push to trigger deployment:**
   ```bash
   git push
   ```

### Fixing Missing Migrations

If a schema change was made without a migration (e.g., using `db push`), create the migration retroactively:

```bash
# This will detect schema drift and create the necessary migration
npm run prisma:migrate -- --name add_missing_table
```

## Deployment Scripts

### Pre-Deployment Checklist

Run before every deployment to validate everything is ready:

```bash
npm run deploy:check
```

This checks:

- Git status (uncommitted changes)
- Code quality (lint, type-check)
- Build success
- Environment variables
- Database migrations
- CLI authentication

### Environment Variable Sync

Sync environment variables to Vercel (handles all environments in one run):

```bash
# Sync all variables to Vercel
npm run deploy:env

# Dry run to see what would be synced
npm run deploy:env:dry
```

The script automatically:

- Sets shared variables (from `.env.vercel`) for **all environments** (production, preview, development)
- Sets production-only variables (from `.env.production`) for **production only**

## Deployment Process

### Standard Deployment (via Git)

1. **Run pre-deployment checks:**

   ```bash
   npm run deploy:check
   ```

2. **Sync environment variables (if changed):**

   ```bash
   npm run deploy:env
   ```

3. **Create PR or push to main:**

   ```bash
   # Via PR (recommended)
   git checkout -b feat/your-feature
   git add .
   git commit -m "feat(scope): description"
   git push origin feat/your-feature
   gh pr create

   # Or direct to main (auto-deploys)
   git push origin main
   ```

### Manual Deployment

```bash
# Deploy to production manually
vercel --prod

# Deploy preview
vercel
```

## Auth0 Configuration via Claude MCP

With the MCP server configured, Claude can help manage Auth0:

### What Claude Can Do

- List and inspect applications
- View resource servers (APIs)
- Check actions and triggers
- Review logs and events
- List and manage forms
- **Create/update/delete** resources (write mode enabled)

### Common Tasks

Ask Claude to help with:

- "List all Auth0 applications in my tenant"
- "Show me the configuration for my web app"
- "Check recent authentication logs"
- "Create a new API resource server"
- "Update the callback URLs for my app"

### Security Note

The MCP server uses your Auth0 CLI credentials. Ensure:

1. You're logged into the correct tenant
2. Your CLI session hasn't expired
3. You review changes before Claude applies them

## Troubleshooting

### MCP Server Not Working

```bash
# Check Auth0 CLI status
auth0 tenants list

# Re-authenticate if needed
auth0 login
```

### Environment Variables Not Syncing

```bash
# Check Vercel CLI status
vercel whoami

# Pull current env vars to verify
vercel env pull
```

### Database Migration Issues

```bash
# Check migration status
npm run prisma:migrate -- --dry-run

# Reset database (CAUTION: destroys data)
npm run prisma:push -- --force-reset
```

### Table Missing in Production

If a table exists in `schema.prisma` but not in the production database:

1. **Check for missing migration:**

   ```bash
   # List all migrations
   ls prisma/migrations/

   # Look for migration that creates the missing table
   grep -r "CREATE TABLE.*TableName" prisma/migrations/
   ```

2. **If no migration exists, create one:**
   ```bash
   npm run prisma:migrate -- --name add_missing_table_name
   git add prisma/migrations/
   git commit -m "fix(db): add missing migration for table_name"
   git push
   ```

This commonly happens when `prisma db push` was used instead of `prisma migrate dev`.

### Build Failures

```bash
# Test build locally
npm run build

# Check for type errors
npm run type-check

# Check for lint errors
npm run lint
```

## Rollback

### Via Vercel Dashboard

1. Go to Vercel Dashboard → Deployments
2. Find the last working deployment
3. Click "..." → "Promote to Production"

### Via CLI

```bash
# List recent deployments
vercel ls

# Rollback to specific deployment
vercel rollback [deployment-url]
```
