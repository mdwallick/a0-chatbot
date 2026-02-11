# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

a0-chatbot is a demonstration chatbot application that integrates Auth0's Auth for GenAI with multiple third-party services (Google, Microsoft, Salesforce, Xbox). It uses Next.js 15, OpenAI's API via the Vercel AI SDK, and PostgreSQL with Prisma for data persistence.

**Key Architecture Principles:**

- This is a **demo/educational project**, not production-ready
- Authentication and token management are handled via Auth0 with linked accounts
- AI tools are dynamically enabled based on user-linked accounts and granted scopes
- All chat messages and threads are persisted to PostgreSQL for authenticated users

## Development Commands

```bash
# Development
npm run dev                # Start dev server with Turbopack
npm run build              # Production build
npm start                  # Start production server

# Code Quality
npm run lint               # Run ESLint
npm run type-check         # TypeScript type checking
npm run format             # Format code with Prettier

# Database (Prisma)
npm run prisma:generate    # Generate Prisma client
npm run prisma:migrate     # Run migrations (uses .env.local)
npm run prisma:push        # Push schema changes
npm run prisma:studio      # Open Prisma Studio GUI
npm run prisma:truncate    # Clear database (runs prisma/scripts/clear-db.ts)
```

**Note:** All `prisma:*` commands use `dotenv -e .env.local` to load environment variables from `.env.local` rather than `.env`.

## Environment Setup

1. Copy `env.sample` to `.env.local` and fill in all required variables
2. Install PostgreSQL: `brew install postgresql`
3. Create database: `createdb chatbot`
4. Run `npm install` (this automatically runs `prisma:generate` via postinstall hook)
5. Run migrations if needed: `npm run prisma:migrate`

**Required Environment Variables:**

- Auth0 credentials (web client + management API M2M client)
- OpenAI API key
- PostgreSQL connection string
- `ENABLED_CONNECTIONS`: JSON map of connection names to Auth0 connection IDs
- Google Custom Search API credentials (for web search tool)
- Salesforce login URL (if enabling Salesforce)
- `IMAGES_PER_DAY_LIMIT`: Image generation limit per user

## Architecture

### Authentication Flow

Auth0 handles all authentication via `@auth0/nextjs-auth0`. The middleware (middleware.ts:6-44) protects paths like `/profile` and `/api/*`. When users link accounts (e.g., Google, Microsoft), tokens are stored in Auth0's token vault and refreshed automatically.

**Linked Accounts:**

- Users can link multiple identity providers (Google, Microsoft, Salesforce, Xbox)
- Each connection has specific OAuth scopes defined in `lib/auth0-ai/connections.ts`
- The `GrantedScope` Prisma model tracks which scopes users have approved
- Linking happens via query params: `?tx=link-account&tx_sub=...&tx_strategy=...&scopes=...`

### AI Chat System

**Main Chat Endpoint:** `app/api/chat/route.ts`

The chat API uses Vercel AI SDK with `streamText()` and Auth0's `@auth0/ai-vercel` interrupts system:

1. Receives messages array and thread ID
2. Sets AI context with `setAIContext({ threadID })`
3. Dynamically constructs tools based on user session
4. Streams responses with `maxSteps: 5` for multi-step tool execution
5. Saves messages to PostgreSQL (for authenticated users only)
6. Auto-generates thread summaries after first exchange using `lib/summarize-thread.ts`

**Tool Architecture:**

- Tools are defined in `lib/ai/tools/` organized by provider (google, microsoft, salesforce, xbox)
- Each tool is wrapped with Auth0's interrupts system to handle:
  - Missing linked accounts → prompts user to link account
  - Missing scopes → triggers incremental consent flow
  - Token refresh and error handling
- Tools that need user context are functions that accept `context` parameter
- Static tools (like WebSearchTool) are plain objects

**Example Tool Pattern:**

```typescript
export const GoogleCalendarReadTool = (context: Context) => {
  return GoogleDriveTool({
    connection: "google-oauth2",
    handler: async ({ params }) => {
      // Tool implementation with automatic token refresh
    },
  })
}
```

### Database Schema (Prisma)

**Models:**

- `ChatThread`: User's conversation threads with auto-generated summaries
- `Message`: Individual messages within threads (cascade delete with thread)
- `XboxCredential`: Cached Xbox authentication tokens
- `GrantedScope`: Tracks OAuth scopes approved by users per connection
- `DailyUsage`: Rate limiting for image generation

**Key Details:**

- Prisma client is generated to `lib/generated/prisma` (not default location)
- All database operations use the singleton `prisma` instance from `lib/prisma.ts`
- Threads are user-scoped but messages are not directly tied to users

### Third-Party Integrations

Each integration has its own folder in `lib/auth0-ai/`:

- **Google** (`lib/auth0-ai/google.ts`): Gmail, Calendar, Drive via googleapis
- **Microsoft** (`lib/auth0-ai/microsoft.ts`): Outlook, Calendar, OneDrive via Microsoft Graph
- **Salesforce** (`lib/auth0-ai/salesforce.ts`): CRM queries via jsforce
- **Xbox** (`lib/auth0-ai/xbox.ts`): Profile and achievements via custom Xbox Live API

**Common Pattern:** Each integration exports helper functions that:

1. Get refresh token from Auth0 session
2. Exchange for access token
3. Initialize provider SDK client
4. Return client for tool use

### Frontend Structure

- **Pages:** Next.js App Router in `app/` directory
  - `/` - Main chat interface (app/page.tsx)
  - `/chat/[id]` - Individual thread view
  - `/profile` - User profile and linked accounts management
  - `/api/*` - API routes
- **Components:** Organized in `components/` (React with TypeScript)
  - `chat.tsx` - Main chat interface using `useChat()` hook
  - `chat-sidebar.tsx` - Conversation history sidebar
  - `auth0/` - Auth0-specific components
  - `auth0-ai/` - Integration management UI
- **Styling:** Tailwind CSS with shadcn/ui components
- **State:** React hooks + SWR for data fetching + Context providers

### API Routes

- `/api/chat` (POST) - Main streaming chat endpoint
- `/api/chat/threads` (GET) - List user's threads
- `/api/chat/[id]` (GET/DELETE) - Get or delete specific thread
- `/api/integrations` (GET) - List available integrations
- `/api/integrations/linked-accounts` (GET/DELETE) - Manage linked accounts
- `/api/link-account` (POST) - Complete account linking flow
- `/api/cleanup` (POST) - Delete user data (requires auth)

## Pull Request Guidelines

Use Conventional Commits with required scopes:

**Format:** `<type>(<scope>): description`

**Types:** feat, fix, chore, docs, refactor, style, test

**Scopes:** auth, calendar, files, mail, ui, ci, deps, ai, infra

**Examples:**

- `feat(ai): add new tool for calendar events`
- `fix(auth): handle expired refresh token`
- `chore(deps): update prisma to 6.8.2`

PRs must follow this format. See CONTRIBUTING.md for full guidelines.

## Important Implementation Details

### Token Refresh

All API tools automatically handle token refresh via Auth0's token vault. If a token expires, the integration helpers will fetch a new one before executing the tool.

### Rate Limiting

Image generation is rate-limited per user via `DailyUsage` table. Check with `getImageCountToday()` and enforce with `IMAGES_PER_DAY_LIMIT` env var.

### Message Trimming

Chat history is trimmed to the last 12 messages (configurable in `lib/utils.ts:trimMessages()`) to stay within model context limits while keeping system messages.

### Unauthenticated Users

The app allows unauthenticated chat, but:

- Messages are not persisted
- No access to integration tools
- No image generation
- Tools requiring auth will trigger login prompts via interrupts

### Husky Pre-commit Hooks

Configured to run `lint-staged` which auto-fixes ESLint issues and formats code with Prettier before commits.

## Common Patterns

**Adding a New AI Tool:**

1. Create tool file in appropriate `lib/ai/tools/<provider>/` directory
2. Export from `lib/ai/tools/<provider>/index.ts`
3. Import and add to `toolDefinitions` object in `app/api/chat/route.ts`
4. If tool needs user context, make it a function that accepts `context` parameter
5. Wrap with appropriate connection provider helper from `lib/auth0-ai/`

**Adding a New Integration:**

1. Create provider helper in `lib/auth0-ai/<provider>.ts`
2. Add connection metadata to `lib/auth0-ai/connections.ts`
3. Add to `ENABLED_CONNECTIONS` env var mapping
4. Create tool files in `lib/ai/tools/<provider>/`
5. Update system prompt in `app/api/chat/route.ts:getSystemTemplate()`

**Working with Prisma:**

- Always use `npm run prisma:migrate` to create migrations (don't use `prisma:push` in production)
- Schema changes require running `prisma:generate` to update the client
- Import the singleton client from `@/lib/prisma` not `@prisma/client`
