# UCP Identity Linking Implementation Summary

## Overview

Implemented OAuth 2.0 identity linking for Universal Checkout Protocol (UCP) that correlates authenticated chatbot users with merchant identities. The implementation enforces authentication, stores user mappings in the database, and supports refresh tokens for long-lived access.

## What Was Implemented

### 1. Database Schema (`prisma/schema.prisma`)

✅ Added `MerchantIdentityLink` table with:

- `chatbotUserId` (unique): Auth0 sub from chatbot session
- `merchantUserId`: Auth0 sub from merchant identity token
- `refreshToken`: OAuth refresh token (nullable)
- `linkedAt`: Timestamp of initial linking
- `lastRefreshedAt`: Auto-updated timestamp

### 2. Authentication Requirements

✅ **Enforced authentication at multiple levels:**

- Identity linking URL only generated if `context.user.id` exists
- Callback endpoint requires active Auth0 session
- Unauthenticated users redirected to login with returnTo parameter

### 3. OAuth 2.0 Flow (`lib/ai/tools/commerce.ts`)

✅ **CheckoutTool updated to:**

- Accept user context as a function parameter
- Generate identity linking URLs only for authenticated users
- Include `offline_access` scope for refresh tokens
- Pass session ID in state parameter for CSRF protection

✅ **Identity linking URL includes:**

```
Scope: openid profile email offline_access
Prompt: consent (force user authorization)
State: base64url({sessionId, timestamp})
```

### 4. OAuth Callback Handler (`app/api/ucp/identity-linking/callback/route.ts`)

✅ **Full implementation:**

- Validates user authentication (requires chatbot session)
- Validates state parameter (CSRF + 5-minute expiry)
- Exchanges authorization code for tokens
- Decodes ID token to extract merchant user's `sub`
- **Stores in database** using Prisma upsert:
  - Creates new record if first linking
  - Updates existing record if re-linking
- Logs all operations for debugging

### 5. Status API Endpoint (`app/api/ucp/identity-linking/status/route.ts`)

✅ **New endpoint** to check linking status:

- `GET /api/ucp/identity-linking/status`
- Requires authentication
- Returns linked status and user IDs
- Doesn't expose refresh token

### 6. AI Instructions (`app/api/chat/route.ts`)

✅ **Updated system prompt:**

- Instructs AI to present identity linking URLs
- Explains benefits (order tracking, saved payments)
- Guides users to sign in if not authenticated

### 7. Streamlined Account Linking

✅ **Implemented Google's OAuth with Sign-In Linking**:

- Added `check`, `create`, `get` parameters to authorization URL
- Created three account management endpoints:
  - `POST /api/ucp/account/check` - Check if account link exists
  - `POST /api/ucp/account/create` - Create new account link
  - `POST /api/ucp/account/get` - Retrieve account information
- Support for `intent` parameter in token exchange
- Enables seamless account creation during OAuth flow

### 8. Documentation

✅ Created comprehensive docs:

- `UCP_IDENTITY_LINKING.md`: Full architecture and flow
- `STREAMLINED_LINKING.md`: Streamlined account linking guide
- `IMPLEMENTATION_SUMMARY.md`: This file

## Key Security Features

### Implemented ✅

1. **CSRF Protection**: State parameter with timestamp
2. **Authentication Enforcement**: Multiple checkpoints
3. **Session Validation**: 5-minute state expiry
4. **Database Constraints**: Unique index on `chatbotUserId`
5. **No Token Exposure**: Refresh tokens not returned by API

### TODO ⚠️

1. **Encrypt refresh tokens at rest** (currently plaintext)
2. Token refresh logic
3. Token revocation
4. Rate limiting on callback endpoint
5. HTTPS enforcement in production

## How It Works

### User Flow

```
1. User signs into chatbot
   ↓
2. User searches for products
   ↓
3. User initiates checkout
   ↓
4. CheckoutTool creates session & generates identity linking URL
   ↓
5. AI presents clickable link to user
   ↓
6. User clicks link → OAuth authorization flow
   ↓
7. User authorizes merchant access
   ↓
8. Callback receives authorization code
   ↓
9. Callback validates user is still authenticated
   ↓
10. Exchange code for tokens
   ↓
11. Store mapping in database:
    - chatbotUserId (from session)
    - merchantUserId (from id_token)
    - refreshToken (if granted)
   ↓
12. Redirect to success page
```

### Database Record Example

```json
{
  "id": "clxxx...",
  "chatbotUserId": "auth0|chatbot123",
  "merchantUserId": "auth0|merchant456",
  "refreshToken": "eyJhbGci...",
  "linkedAt": "2026-02-11T15:30:00.000Z",
  "lastRefreshedAt": "2026-02-11T15:30:00.000Z"
}
```

## Testing

### Verify Implementation

```bash
# 1. Generate Prisma client
npm run prisma:generate

# 2. Push schema to database
npm run prisma:push

# 3. Test URL generation
npx tsx test-idlink-url.ts

# 4. Start dev server
npm run dev

# 5. Test in browser
# - Sign in to chatbot
# - Search for products
# - Create checkout
# - Click identity linking URL
# - Complete OAuth flow
# - Check database

# 6. Query database
npm run prisma:studio
# Or SQL: SELECT * FROM "MerchantIdentityLink";
```

### API Testing

```bash
# Check identity linking status (must be authenticated)
curl http://localhost:3000/api/ucp/identity-linking/status \
  -H "Cookie: appSession=..."
```

## Environment Variables

### Required

```bash
MERCHANT_IDLINK_CLIENT_ID=U5xtIqc7cu707C28nQHeCKplg9ec2VPe
MERCHANT_IDLINK_CLIENT_SECRET=ROoaFqNODAo...
MERCHANT_IDLINK_DOMAIN=agentic-commerce-merchant.cic-demo-platform.auth0app.com
APP_BASE_URL=http://localhost:3000
```

### In Auth0

**Configure redirect URIs:**

```
http://localhost:3000/api/ucp/identity-linking/callback
https://your-production-domain.com/api/ucp/identity-linking/callback
```

## Code Changes Summary

### Modified Files

- `prisma/schema.prisma` - Added MerchantIdentityLink model
- `lib/ai/tools/commerce.ts` - Updated CheckoutTool for auth + scope
- `app/api/chat/route.ts` - Updated system prompt
- `UCP_IDENTITY_LINKING.md` - Updated documentation

### New Files

- `app/api/ucp/identity-linking/callback/route.ts` - OAuth callback
- `app/api/ucp/identity-linking/status/route.ts` - Status endpoint
- `app/api/ucp/account/check/route.ts` - Check account (streamlined linking)
- `app/api/ucp/account/create/route.ts` - Create account (streamlined linking)
- `app/api/ucp/account/get/route.ts` - Get account (streamlined linking)
- `test-idlink-url.ts` - URL generation test
- `test-checkout-authenticated.ts` - Authentication test
- `IMPLEMENTATION_SUMMARY.md` - This file
- `STREAMLINED_LINKING.md` - Streamlined linking guide

## Next Steps

### High Priority

1. **Encrypt refresh tokens** - Add encryption at rest
2. **Token refresh** - Implement automatic token refresh
3. **Error handling** - Better UX for auth failures
4. **HTTPS** - Configure for production

### Medium Priority

5. **Rate limiting** - Protect callback endpoint
6. **Monitoring** - Add logging/alerting
7. **Token revocation** - Allow users to unlink
8. **UI improvements** - Better identity linking UX

### Low Priority

9. **Token expiry checks** - Validate before use
10. **Consent management** - UI for managing links
11. **Health checks** - Service monitoring

## Benefits

### For Users

- ✅ Secure identity linking with merchant
- ✅ Order tracking capabilities
- ✅ Saved payment methods
- ✅ Personalized shopping experience
- ✅ Long-lived access via refresh tokens

### For Development

- ✅ Clean separation of chatbot and merchant identities
- ✅ Persistent storage for future UCP operations
- ✅ Extensible for additional merchant features
- ✅ Follows OAuth 2.0 best practices

## References

- [Google UCP Identity Linking](https://developers.google.com/merchant/ucp/guides/identity-linking)
- [OAuth 2.0 Authorization Code Flow](https://oauth.net/2/grant-types/authorization-code/)
- [Auth0 Refresh Tokens](https://auth0.com/docs/secure/tokens/refresh-tokens)
