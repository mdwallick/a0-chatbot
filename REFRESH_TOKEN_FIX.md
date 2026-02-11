# Refresh Token Fix - Microsoft Connection

## Problem

The token vault was failing with `tokenResponse undefined` because Microsoft wasn't providing a refresh token. Without a refresh token, Auth0's token vault cannot exchange it for access tokens.

## Root Cause

The `windowslive` (Microsoft) connection configuration was **missing the `offline_access` scope**, which is required by Microsoft to issue refresh tokens.

## Solution Applied

### 1. Added `offline_access` Scope

Updated `lib/auth0-ai/connections.ts` to include `offline_access`:

```typescript
windowslive: {
  scopes: [
    "offline_access", // ← ADDED: Required for refresh tokens!
    "https://graph.microsoft.com/User.Read",
    "https://graph.microsoft.com/Mail.Read",
    // ... other scopes
  ],
}
```

### 2. Updated Friendly Scopes

Added user-friendly description:

```
"Maintain access to data when you're not using this app"
```

## Required Auth0 Configuration

You MUST also configure the Auth0 connection to request `offline_access`:

### Steps:

1. **Go to Auth0 Dashboard**

   - Navigate to: Authentication > Social > Windows Live (or Microsoft)

2. **Edit the Connection**

   - Click on the connection to edit it

3. **Add offline_access Scope**

   - Look for "Scopes" or "Permissions" field
   - Add: `offline_access`
   - The full scope list should include:
     ```
     offline_access
     User.Read
     Calendars.Read
     Calendars.ReadWrite
     Mail.Read
     Mail.ReadWrite
     Mail.Send
     Files.Read
     Files.ReadWrite
     ```

4. **Save the Connection**

5. **Enable Token Exchange** (if not already enabled)
   - Look for "Token Exchange" toggle
   - Turn it ON
   - This allows the token vault to exchange refresh tokens for access tokens

## Testing After Configuration

### Clear Existing Linked Account

Since your current linked Microsoft account doesn't have a refresh token, you need to re-link it:

1. **Go to** http://localhost:3000/profile
2. **Find Microsoft/Windows Live connection**
3. **Click "Disconnect" or "Revoke"**
4. **Link it again** (this will request the new scopes including offline_access)

### Test the Calendar Feature

1. **Start a new chat**
2. **Ask:** "What's on my calendar today?"
3. **When the consent popup appears:**
   - You should see `offline_access` in the permissions list
   - Grant permission
4. **Popup should close**
5. **Bot should continue and show your calendar events!** ✅

## Verification

### Check Refresh Token in Session

You can verify a refresh token exists by checking the Auth0 session:

```typescript
const session = await auth0.getSession()
console.log("Has refresh token:", !!session?.tokenSet.refreshToken)
```

If this returns `true`, you have a refresh token.

### Check Token Vault Logs

After granting consent, server logs should show:

```
[Token Debug] Attempting to get token for connection: windowslive/Microsoft
[Token Debug] SUCCESS: Got valid token (length: XXXX)
```

Instead of:

```
tokenResponse undefined  // ← This means no refresh token
```

## Why offline_access is Required

Microsoft's OAuth 2.0 implementation requires the `offline_access` scope to issue refresh tokens:

- **Without `offline_access`**: Microsoft only returns an access token (expires in ~1 hour)
- **With `offline_access`**: Microsoft returns both an access token AND a refresh token

The refresh token allows Auth0's token vault to:

1. Store it securely
2. Exchange it for new access tokens when needed
3. Keep the user authenticated to Microsoft services without re-prompting for consent

Reference: https://learn.microsoft.com/en-us/entra/identity-platform/v2-oauth2-auth-code-flow

## Additional Notes

### Google Connection

Note that Google uses a similar pattern but with a different scope:

- Google: `access_type=offline` (already configured)
- Microsoft: `offline_access` scope (now configured)

### Connection String Format

The code already sends `access_type: "offline"` in the popup.tsx file (line 85), which is the OAuth parameter. But Microsoft specifically looks for the `offline_access` scope in the scope list.

### Refresh Token Security

Refresh tokens are sensitive and should never be exposed to the client. Auth0's token vault handles this securely:

- Refresh tokens are stored encrypted in Auth0
- Only access tokens are returned to your application
- Refresh happens automatically in the background
