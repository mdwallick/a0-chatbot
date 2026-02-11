# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a demo AI chatbot application built with Next.js 15 that showcases Auth0's [Auth for GenAI](https://auth0.ai). The application enables authenticated users to interact with an AI assistant that can access various third-party services (Google Workspace, Microsoft 365, Salesforce, Xbox) through Auth0's token vault and linked accounts.

**Important**: This is a demo project, not production-ready. See README.md disclaimer.

## Development Commands

### Setup

```bash
# Install dependencies (also runs prisma:generate via postinstall hook)
npm install

# Copy environment template and configure
cp env.sample .env.local
# Edit .env.local with your Auth0, OpenAI, and database credentials
```

### Running the Application

```bash
# Start development server with Turbopack
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

### Code Quality

```bash
# Lint code
npm run lint

# Type check without emitting files
npm run type-check

# Format code with Prettier
npm run format
```

### Database (Prisma)

```bash
# Generate Prisma client (runs automatically on postinstall)
npm run prisma:generate

# Create and apply migration
npm run prisma:migrate

# Push schema changes without migration
npm run prisma:push

# Pull schema from existing database
npm run prisma:pull

# Open Prisma Studio GUI
npm run prisma:studio

# Clear all data from database
npm run prisma:truncate
```

Note: All prisma commands use `dotenv-cli` to load `.env.local` automatically.

## Architecture Overview

### Core Tech Stack

- **Framework**: Next.js 15 (App Router) with React 19
- **Authentication**: Auth0 with `@auth0/nextjs-auth0` and `@auth0/ai-vercel`
- **AI**: Vercel AI SDK with liteLLM proxy (supporting multiple LLM providers)
- **Database**: PostgreSQL with Prisma ORM
- **Styling**: Tailwind CSS 4 + Radix UI components

### Directory Structure

- `app/` - Next.js App Router pages and API routes
  - `api/chat/` - Chat streaming endpoints
  - `api/integrations/` - Third-party integration management
  - `api/link-account/` - Auth0 linked accounts
  - `chat/[id]/` - Individual chat thread pages
- `lib/` - Core application logic
  - `ai/tools/` - AI tool definitions organized by provider
  - `auth0-ai/` - Auth0 token management and connection helpers
  - `generated/prisma/` - Generated Prisma client
- `components/` - React components (UI, chat interface, auth)
- `prisma/` - Database schema and migrations
- `actions/` - Server actions

### Authentication & Authorization Flow

1. **Auth0 Middleware** (`middleware.ts`): Protects routes, handles linked account transactions
2. **Token Management** (`lib/auth0-ai/`): Each provider (Google, Microsoft, Salesforce, Xbox) has:
   - Connection definition in `lib/auth0-ai/connections.ts`
   - Provider-specific helper functions using `Auth0AI.withTokenForConnection()`
   - Scope definitions for granular permissions
3. **Linked Accounts**: Users can connect multiple third-party accounts via Auth0's linked accounts feature

### AI Tools Architecture

AI tools are organized by provider in `lib/ai/tools/`:

```
lib/ai/tools/
├── google/          # Gmail, Calendar, Drive tools
├── microsoft/       # Outlook, OneDrive tools
├── salesforce/      # CRM query/search tools
├── xbox/            # Xbox profile and achievements
├── dalle.ts         # Image generation (rate limited)
├── web-search.ts    # Google Custom Search
└── index.ts         # Tool exports
```

**Tool Pattern**:

1. Each tool uses `auth0AI.withTokenForConnection()` to wrap the tool definition
2. Token is automatically retrieved via `getAccessTokenForConnection()` inside execute
3. Tools handle `FederatedConnectionError` for auth failures (triggers consent flow)
4. Context object passed to tools includes `user` info when authenticated

**Key Tool Characteristics**:

- Tools are functions that accept a `context` object (for user info)
- Use Zod schemas for parameter validation
- Return logs and structured data for LLM consumption
- Integrate with Vercel AI SDK's `tool()` function

### Chat Flow

1. User sends message to `POST /api/chat`
2. Request includes thread ID and messages array
3. Server:
   - Sets AI context with thread ID via `setAIContext()`
   - Retrieves user session and constructs context object
   - Loads all available tools (some are context-dependent)
   - Saves user message to database (if authenticated)
   - Streams response using `streamText()` with Auth0 interruptions support
   - Auto-generates thread summary after first exchange
   - Saves assistant response to database on finish
4. Tools can trigger interruptions (e.g., consent flows) via `withInterruptions()`

### Database Schema (Prisma)

- `ChatThread`: Conversation threads with auto-generated summaries
- `Message`: Individual chat messages (linked to threads)
- `XboxCredential`: Xbox Live tokens and user hashes
- `GrantedScope`: Tracks user-granted scopes per connection
- `DailyUsage`: Tracks image generation rate limits

### Rate Limiting

Image generation via DALL-E is rate limited per user per day:

- Limit configured via `IMAGES_PER_DAY_LIMIT` env var (default: 3)
- Tracked in `DailyUsage` table
- Enforced in system prompt and tool execution

### Environment Variables

See `env.sample` for complete list. Key variables:

- Auth0 web client credentials (`AUTH0_DOMAIN`, `AUTH0_CLIENT_ID`, etc.)
- Auth0 M2M client for management API (`AUTH0_CLIENT_ID_MGMT`, scopes: read/update/delete users)
- liteLLM API key and base URL (`LITELLM_API_KEY`, `LITELLM_BASE_URL`)
- Model name for routing (`OPENAI_MODEL` - e.g., gpt-4o-mini)
- PostgreSQL connection string
- `ENABLED_CONNECTIONS`: JSON map of connection names to Auth0 connection IDs
- Google Custom Search API credentials (for web search)

## Development Guidelines

### Adding New AI Tools

1. Create tool file in `lib/ai/tools/<provider>/`
2. Define Zod schema for parameters
3. Create token wrapper using `auth0AI.withTokenForConnection()` with required scopes
4. Implement tool with `tool()` from AI SDK
5. Export from `lib/ai/tools/<provider>/index.ts`
6. Export from `lib/ai/tools/index.ts`
7. Add to `toolDefinitions` object in `app/api/chat/route.ts`
8. Update system prompt in `getSystemTemplate()` if needed

### Adding New Providers

1. Add connection config to `lib/auth0-ai/connections.ts`
2. Create provider file in `lib/auth0-ai/<provider>.ts` with scope-specific wrappers
3. Create tools directory: `lib/ai/tools/<provider>/`
4. Implement tools following existing patterns
5. Add provider to `ENABLED_CONNECTIONS` environment variable

### Prisma Workflow

After schema changes in `prisma/schema.prisma`:

```bash
npm run prisma:migrate  # Creates migration and applies it
npm run prisma:generate # Regenerates client (also runs via postinstall)
```

### Pre-commit Hooks

Husky + lint-staged automatically runs on commit:

- ESLint with auto-fix on `.ts`, `.tsx`, `.js`, `.jsx`
- Prettier formatting on all supported files

### PR Guidelines

Follow Conventional Commits format: `<type>(<scope>): description`

**Types**: feat, fix, chore, docs, refactor, style, test

**Scopes**: auth, calendar, files, mail, ui, ci, deps, ai, infra

See CONTRIBUTING.md for full details.

## Key Concepts

### Auth0 AI SDK Patterns

- **Token Vault**: Auth0 securely stores and refreshes OAuth tokens
- **Linked Accounts**: Users can connect multiple identities to one Auth0 account
- **withTokenForConnection()**: Higher-order function that handles token retrieval and error handling
- **Interruptions**: Auth0 AI SDK can pause LLM execution to trigger consent/auth flows via `withInterruptions()`

### Message Trimming

The application keeps last 12 messages (via `trimMessages()`) to manage context window while preserving system messages. Adjust `maxMessages` in `app/api/chat/route.ts` if needed.

### System Prompt

Defined in `getSystemTemplate()` in `app/api/chat/route.ts`. Includes:

- User name, image usage limits
- Available integrations
- Tool selection rules (prevent mixing tools unnecessarily)
- Date/time formatting requirements (ISO 8601 UTC)
- Reasoning/narration instructions

## Common Tasks

### Debugging Token Issues

1. Check `lib/auth0-ai/<provider>.ts` for correct scope definitions
2. Verify `ENABLED_CONNECTIONS` mapping in `.env.local`
3. Check Auth0 connection configuration (scopes must be enabled)
4. Use browser DevTools Network tab to inspect token exchange

### Testing Tools Locally

1. Ensure user has linked the required account via `/profile` page
2. Use chat interface to invoke tool
3. Check server logs for tool execution details
4. Verify tool returns proper structure for LLM consumption

### Database Inspection

```bash
npm run prisma:studio  # Opens GUI at http://localhost:5555
```

## liteLLM Integration

This project uses liteLLM as a unified proxy for LLM providers instead of calling OpenAI directly.

### Configuration

The liteLLM provider is configured in `lib/litellm.ts`:

- Uses `createOpenAI()` from Vercel AI SDK with custom `baseURL`
- Set `compatibility: "compatible"` for 3rd party provider support
- Requires `LITELLM_API_KEY` and `LITELLM_BASE_URL` environment variables

### Model Routing

liteLLM handles model routing based on the model name passed to it:

- Chat/completion: Uses model specified in `OPENAI_MODEL` env var
- Image generation (DALL-E): Configured in `lib/ai/tools/dalle.ts`
- Thread summarization: Uses `gpt-4o` model

Ensure your liteLLM instance is configured with the appropriate model mappings.

### Image Generation Notes

DALL-E image generation goes through liteLLM (`lib/ai/tools/dalle.ts`). If your liteLLM instance doesn't support image generation:

1. Add a separate `OPENAI_API_KEY` environment variable
2. Update `dalle.ts` to use direct OpenAI client with that key
3. Keep other endpoints using liteLLM
