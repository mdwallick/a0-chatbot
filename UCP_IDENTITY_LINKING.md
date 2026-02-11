# UCP Identity Linking Implementation

This document describes the OAuth 2.0 identity linking implementation for Universal Checkout Protocol (UCP) per [Google's UCP Identity Linking guide](https://developers.google.com/merchant/ucp/guides/identity-linking).

## Overview

After a user initiates a checkout session, the system generates an OAuth 2.0 authorization URL that allows the user to link their identity with the merchant. This enables:

- Order tracking
- Personalized shopping experience
- Saved payment methods
- Order history

## Architecture

### 1. Database Schema

A new table `MerchantIdentityLink` stores the relationship between chatbot users and merchant identities:

```prisma
model MerchantIdentityLink {
  id                String   @id @default(cuid())
  chatbotUserId     String   @unique
  merchantUserId    String
  refreshToken      String?
  linkedAt          DateTime @default(now())
  lastRefreshedAt   DateTime @updatedAt

  @@index([chatbotUserId])
  @@index([merchantUserId])
}
```

**Fields:**

- `chatbotUserId`: Auth0 sub from the chatbot user session (unique per user)
- `merchantUserId`: Auth0 sub from the merchant identity linking (from id_token)
- `refreshToken`: OAuth refresh token for long-lived access (optional, requires `offline_access` scope)
- `linkedAt`: Timestamp when identity was first linked
- `lastRefreshedAt`: Timestamp of last update (auto-updated)

### 2. Environment Configuration

Three new environment variables are required in `.env.local`:

```bash
MERCHANT_IDLINK_CLIENT_ID=U5xtIqc7cu707C28nQHeCKplg9ec2VPe
MERCHANT_IDLINK_CLIENT_SECRET=ROoaFqNODAoJMLDusueVXwHttm55x5VkuUsQ_ju2dP10BTrCZE1kC0LE1gyzKE0s
MERCHANT_IDLINK_DOMAIN=agentic-commerce-merchant.cic-demo-platform.auth0app.com
```

### 3. Flow Implementation

#### Step 0: Authentication Requirement

**IMPORTANT**: The user MUST be signed into the chatbot before identity linking can occur.

- Identity linking URL is only generated if `context.user.id` is present
- The callback endpoint requires an active Auth0 session
- Unauthenticated users will be redirected to login with a returnTo parameter

#### Step 1: Checkout Session Creation

When `CheckoutTool` creates a checkout session, it automatically generates an identity linking URL **only if the user is authenticated**.

**Location**: `lib/ai/tools/commerce.ts`

```typescript
// CheckoutTool accepts context with user information
export const CheckoutTool = (context?: { user?: { id?: string } }) => {
  const userId = context?.user?.id

  return tool({
    execute: async args => {
      // Create checkout...

      // Generate identity linking URL (requires authenticated user)
      const identityLinkingUrl = generateIdentityLinkingUrl(sessionId, userId)

      return {
        success: true,
        sessionId: sessionId,
        identityLinkingUrl: identityLinkingUrl, // null if not authenticated
        ...checkoutData,
      }
    },
  })
}
```

#### Step 2: Authorization URL Generation

The `generateIdentityLinkingUrl()` function creates an OAuth authorization URL with:

- **Client ID**: From `MERCHANT_IDLINK_CLIENT_ID`
- **Response Type**: `code` (authorization code flow)
- **Redirect URI**: `{APP_BASE_URL}/api/ucp/identity-linking/callback`
- **State**: Base64url-encoded JSON containing:
  - `sessionId`: The checkout session ID
  - `timestamp`: CSRF protection timestamp
- **Scope**: `openid profile email offline_access`
  - `openid`: Required for ID token
  - `profile`: User profile information
  - `email`: User email address
  - `offline_access`: Enables refresh token for long-lived access
- **Prompt**: `consent` (force user consent)

**Example URL**:

```
https://agentic-commerce-merchant.cic-demo-platform.auth0app.com/authorize
  ?client_id=U5xtIqc7cu707C28nQHeCKplg9ec2VPe
  &response_type=code
  &redirect_uri=http://localhost:3000/api/ucp/identity-linking/callback
  &state=eyJzZXNzaW9uSWQiOi...
  &scope=openid+profile+email
  &prompt=consent
```

#### Step 3: User Authorization

The user is redirected to the merchant's Auth0 authorization server where they:

1. Authenticate (if not already logged in)
2. Review the requested permissions
3. Consent to linking their identity
4. Get redirected back with an authorization code

#### Step 4: OAuth Callback Handler

The callback endpoint handles the OAuth redirect.

**Location**: `app/api/ucp/identity-linking/callback/route.ts`

**Process**:

1. **Requires Authentication**: Checks for active Auth0 session (chatbot user must be signed in)
2. Receives authorization code and state
3. Validates state parameter (CSRF protection, 5-minute expiry)
4. Exchanges authorization code for tokens
5. Decodes ID token to extract merchant user's `sub`
6. **Stores in Database**: Creates/updates `MerchantIdentityLink` record:
   - `chatbotUserId`: From Auth0 session
   - `merchantUserId`: From ID token `sub` claim
   - `refreshToken`: From token response (if `offline_access` granted)
7. Redirects user to success page

**Token Exchange Request**:

```typescript
POST https://{MERCHANT_IDLINK_DOMAIN}/oauth/token
{
  "client_id": MERCHANT_IDLINK_CLIENT_ID,
  "client_secret": MERCHANT_IDLINK_CLIENT_SECRET,
  "code": "{authorization_code}",
  "redirect_uri": "{callback_url}",
  "grant_type": "authorization_code"
}
```

**Response**:

```json
{
  "access_token": "eyJhbGci...",
  "id_token": "eyJhbGci...",
  "token_type": "Bearer",
  "expires_in": 86400
}
```

#### Step 5: AI Assistant Presentation

The AI assistant presents the identity linking URL to users:

**System Prompt Instructions** (in `app/api/chat/route.ts`):

```
After creating a checkout:
- If an identityLinkingUrl is returned, present it as: [Link your account to complete checkout](identityLinkingUrl)
- Explain that linking enables order tracking and personalized features
```

## Testing

### Test Identity Linking URL Generation

```bash
npx tsx test-idlink-url.ts
```

This generates and displays a test authorization URL with all parameters.

### Test Full Checkout with Identity Linking

```bash
npx tsx test-identity-linking.ts
```

This creates a real checkout session and displays the identity linking URL.

### Manual Testing Flow

1. **Ensure you're signed in** to the chatbot first (critical!)
2. Start dev server: `npm run dev`
3. In the chatbot, search for products: "show me ponies"
4. Create checkout: "I want to buy the Miniature Pony"
5. The AI will display an identity linking URL (only if signed in)
6. Click the URL to complete OAuth authorization
7. You'll be redirected back to the app
8. Check server logs for `[Identity Linking]` messages
9. Verify database record: Check `MerchantIdentityLink` table

### Check Identity Linking Status

```bash
# While authenticated in browser, visit:
http://localhost:3000/api/ucp/identity-linking/status
```

Or query the database directly:

```sql
SELECT * FROM "MerchantIdentityLink";
```

## Security Considerations

### State Parameter

- Contains base64url-encoded JSON with session ID and timestamp
- Validated on callback to prevent CSRF attacks
- Expires after 5 minutes

### Token Storage

**Implemented**: Tokens are stored in the `MerchantIdentityLink` table:

- ✅ Stored in PostgreSQL database
- ✅ Associated with chatbot user (via `chatbotUserId`)
- ✅ Linked to merchant identity (via `merchantUserId`)
- ✅ Refresh token stored (if `offline_access` scope granted)
- ⚠️ **Security Note**: Refresh tokens are stored in plaintext. Production implementation should:
  - Encrypt refresh tokens at rest
  - Use environment variables for encryption keys
  - Implement key rotation
  - Consider using a secrets management service (AWS Secrets Manager, HashiCorp Vault)
- 🔄 **TODO**: Implement token refresh logic to exchange expired access tokens

### Redirect URI Validation

- The redirect URI must match exactly what's configured in Auth0
- Use HTTPS in production
- Whitelist allowed redirect URIs

## Production Checklist

- [x] Implement persistent token storage (PostgreSQL)
- [x] Enforce authentication before identity linking
- [x] Store chatbot user → merchant user mapping
- [x] Request `offline_access` scope for refresh tokens
- [x] Validate state parameter (CSRF protection)
- [ ] **Encrypt refresh tokens at rest**
- [ ] Add token refresh logic (exchange expired tokens)
- [ ] Use HTTPS for redirect URIs
- [ ] Configure allowed redirect URIs in Auth0
- [ ] Add error handling for expired sessions
- [ ] Implement token revocation endpoint
- [ ] Add user consent management UI
- [ ] Log all OAuth operations for audit
- [ ] Rate limit callback endpoint
- [ ] Add monitoring and alerting
- [ ] Implement token expiry checks
- [ ] Add health check for identity linking service

## API Endpoints

### Callback Endpoint

- **URL**: `GET /api/ucp/identity-linking/callback`
- **Authentication**: Required (Auth0 session)
- **Parameters**:
  - `code`: Authorization code from OAuth server
  - `state`: State parameter for CSRF protection
  - `error` (optional): OAuth error code
  - `error_description` (optional): Error description
- **Response**: Redirects to success or error page

### Status Endpoint

- **URL**: `GET /api/ucp/identity-linking/status`
- **Authentication**: Required (Auth0 session)
- **Response**:
  ```json
  {
    "linked": true,
    "chatbotUserId": "auth0|...",
    "merchantUserId": "auth0|...",
    "linkedAt": "2026-02-11T15:30:00.000Z",
    "lastRefreshedAt": "2026-02-11T15:30:00.000Z"
  }
  ```

### Success/Error Redirects

- **Success**: `/?success=identity_linked&session={sessionId}`
- **Error**: `/?error=identity_linking_failed&message={errorMessage}`
- **Login Required**: `/auth/login?returnTo={encodedCallbackUrl}`

## References

- [Google UCP Identity Linking Guide](https://developers.google.com/merchant/ucp/guides/identity-linking)
- [OAuth 2.0 Authorization Code Flow](https://oauth.net/2/grant-types/authorization-code/)
- [Auth0 Authorization Code Flow](https://auth0.com/docs/get-started/authentication-and-authorization-flow/authorization-code-flow)
