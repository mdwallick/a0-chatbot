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

## Deployment Scripts

### Pre-Deployment Checklist

Run before every deployment to validate everything is ready:

```bash
./scripts/deploy/pre-deploy-check.sh
```

This checks:

- Git status (uncommitted changes)
- Code quality (lint, type-check)
- Build success
- Environment variables
- Database migrations
- CLI authentication

### Environment Variable Sync

Sync your local `.env.local` to Vercel:

```bash
# Sync to production
./scripts/deploy/vercel-env-sync.sh production

# Sync to preview (for PR deployments)
./scripts/deploy/vercel-env-sync.sh preview
```

## Deployment Process

### Standard Deployment (via Git)

1. **Run pre-deployment checks:**

   ```bash
   ./scripts/deploy/pre-deploy-check.sh
   ```

2. **Sync environment variables (if changed):**

   ```bash
   ./scripts/deploy/vercel-env-sync.sh production
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

## Environment Variables

### Required for Production

| Variable                   | Description                    |
| -------------------------- | ------------------------------ |
| `AUTH0_DOMAIN`             | Your Auth0 tenant domain       |
| `AUTH0_CLIENT_ID`          | Web application client ID      |
| `AUTH0_CLIENT_SECRET`      | Web application client secret  |
| `AUTH0_SECRET`             | Session encryption secret      |
| `AUTH0_CLIENT_ID_MGMT`     | M2M client for Management API  |
| `AUTH0_CLIENT_SECRET_MGMT` | M2M client secret              |
| `AUTH0_ISSUER_BASE_URL`    | Full Auth0 issuer URL          |
| `APP_BASE_URL`             | Your production URL            |
| `DATABASE_URL`             | PostgreSQL connection string   |
| `OPENAI_API_KEY`           | OpenAI API key                 |
| `OPENAI_MODEL`             | Model name (e.g., gpt-4o-mini) |
| `ENABLED_CONNECTIONS`      | JSON map of connections        |

### Optional

| Variable                | Description                    |
| ----------------------- | ------------------------------ |
| `LITELLM_API_KEY`       | LiteLLM proxy key (if using)   |
| `LITELLM_BASE_URL`      | LiteLLM proxy URL              |
| `GOOGLE_CX`             | Google Custom Search engine ID |
| `GOOGLE_SEARCH_API_KEY` | Google Search API key          |
| `SALESFORCE_LOGIN_URL`  | Salesforce tenant URL          |
| `IMAGES_PER_DAY_LIMIT`  | DALL-E rate limit (default: 3) |

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
