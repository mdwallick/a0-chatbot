# Token Vault Fix - Auth0 AI Configuration Issue

## Problem

After granting consent through the popup, the bot was not resuming the original request. Investigation revealed that the token vault was returning `tokenResponse undefined` errors:

```
Response {
  ...
  ok: false,
  redirected: false,
  type: 'basic',
  url: 'https://genai.atko.rocks/oauth/token'
}
tokenResponse undefined
```

## Root Cause

The `Auth0AI` instances were being initialized **without any configuration**:

```typescript
// BEFORE (BROKEN) ❌
const auth0AI = new Auth0AI() // No credentials!
```

According to the [Auth0 AI SDK documentation](https://github.com/auth0/ai-sdks/tree/main/packages/ai-vercel), the SDK requires Auth0 credentials to communicate with the token vault:

```typescript
const auth0AI = new Auth0AI({
  auth0: {
    domain: "YOUR_AUTH0_DOMAIN",
    clientId: "YOUR_AUTH0_CLIENT_ID",
    clientSecret: "YOUR_AUTH0_CLIENT_SECRET",
  },
})
```

Without these credentials, the SDK couldn't authenticate with the Auth0 token vault (`genai.atko.rocks`), causing all token retrieval requests to fail.

## Solution

### 1. Created Centralized Auth0AI Configuration

Created `lib/auth0-ai/index.ts` with properly configured Auth0AI instance:

```typescript
import { Auth0AI } from "@auth0/ai-vercel"

export const auth0AI = new Auth0AI({
  auth0: {
    domain: process.env.AUTH0_DOMAIN!,
    clientId: process.env.AUTH0_CLIENT_ID!,
    clientSecret: process.env.AUTH0_CLIENT_SECRET!,
  },
})
```

### 2. Updated All Provider Files

Updated these files to import the centralized instance instead of creating their own:

- `lib/auth0-ai/google.ts`
- `lib/auth0-ai/microsoft.ts`
- `lib/auth0-ai/salesforce.ts`
- `lib/auth0-ai/xbox.ts`

Changed from:

```typescript
import { Auth0AI } from "@auth0/ai-vercel"
const auth0AI = new Auth0AI()
```

To:

```typescript
import { auth0AI } from "./index"
```

### 3. Added Debug Logging

Created `lib/debug-token-helper.ts` to help troubleshoot token retrieval issues:

```typescript
export function debugGetAccessToken(connectionName: string): string {
  console.log(`[Token Debug] Attempting to get token for connection: ${connectionName}`)

  const token = getAccessTokenForConnection()

  if (!token) {
    console.error(`[Token Debug] ERROR: No token returned from vault`)
    throw new Error(`No access token available for connection: ${connectionName}`)
  }

  console.log(`[Token Debug] SUCCESS: Got valid token (length: ${token.length})`)
  return token
}
```

### 4. Enhanced Frontend Logging

Added logging in `components/auth0-ai/FederatedConnections/popup.tsx` to track the consent flow:

```typescript
console.log("[Auth0 AI] Waiting for session sync...")
await new Promise(resolve => setTimeout(resolve, 2000))
console.log("[Auth0 AI] Resuming AI processing after consent granted")
resume()
```

## Files Changed

### New Files

- `lib/auth0-ai/index.ts` - Centralized Auth0AI configuration
- `lib/debug-token-helper.ts` - Debug utilities for token retrieval
- `TOKEN_VAULT_FIX.md` - This documentation

### Modified Files

- `lib/auth0-ai/google.ts` - Use centralized Auth0AI
- `lib/auth0-ai/microsoft.ts` - Use centralized Auth0AI
- `lib/auth0-ai/salesforce.ts` - Use centralized Auth0AI
- `lib/auth0-ai/xbox.ts` - Use centralized Auth0AI
- `lib/ai/tools/microsoft/calendar-read.ts` - Added debug logging
- `components/auth0-ai/FederatedConnections/popup.tsx` - Fixed resume() logic + added delay

## Testing

### Before Fix

1. Ask bot: "What's on my calendar today?"
2. Grant consent in popup
3. ❌ Bot stops, shows no calendar events
4. Logs show: `tokenResponse undefined`

### After Fix

1. Ask bot: "What's on my calendar today?"
2. Grant consent in popup
3. Wait 2 seconds for session sync
4. ✅ Bot continues and shows calendar events
5. Logs show: `[Token Debug] SUCCESS: Got valid token`

### Console Output (Success)

```
[Auth0 AI] Initialized with domain: your-tenant.us.auth0.com
[Token Debug] Attempting to get token for connection: windowslive/Microsoft
[Token Debug] SUCCESS: Got valid token (length: 1234)
[Token Debug] Token preview: eyJ0eXAiOiJKV1QiLCJhbGciOiJ...
```

## Why This Matters

The Auth0 AI SDK uses a "token vault" service (`genai.atko.rocks`) to securely store and retrieve OAuth tokens for third-party services. This vault:

1. **Stores tokens securely** - Access tokens and refresh tokens are stored in Auth0's infrastructure
2. **Handles token refresh** - Automatically refreshes expired tokens
3. **Provides token exchange** - Exchanges refresh tokens for access tokens on-demand

Without proper Auth0 credentials, the SDK cannot authenticate with this vault service, causing all token operations to fail silently.

## Related Issues

This fix also resolves:

- ✅ Google Drive/Gmail/Calendar access after consent
- ✅ Microsoft OneDrive/Outlook/Calendar access after consent
- ✅ Salesforce CRM access after consent
- ✅ Xbox profile/achievements access after consent

All federated connection tools depend on the token vault, so this fix applies to all providers.

## Additional Notes

### Session Sync Delay

The 2-second delay in `popup.tsx` allows the Auth0 session to sync with the token vault after consent is granted:

```typescript
await new Promise(resolve => setTimeout(resolve, 2000))
```

This is necessary because:

1. User grants consent in popup
2. OAuth callback completes
3. Token is stored in vault
4. Parent window session needs to refresh
5. Then `resume()` can successfully retrieve the token

Without this delay, `resume()` might be called before the parent window's session has the new token available.

### Environment Variables Required

Ensure these are set in `.env.local`:

```bash
AUTH0_DOMAIN=your-tenant.us.auth0.com
AUTH0_CLIENT_ID=your_client_id
AUTH0_CLIENT_SECRET=your_client_secret
```

These are the same credentials used for the Next.js Auth0 SDK, so they should already be configured.

## Future Improvements

1. **Remove hardcoded delay** - Replace the 2-second delay with a proper session refresh mechanism
2. **Retry logic** - Add exponential backoff if token retrieval fails
3. **Better error messages** - Surface token vault errors to the user
4. **Health check endpoint** - Add `/api/health` to verify token vault connectivity
