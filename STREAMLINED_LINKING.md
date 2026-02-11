# Streamlined Account Linking for UCP

This document describes the streamlined account linking implementation following Google's OAuth with Sign-In Linking specification.

## Overview

Streamlined linking enhances the standard OAuth flow by providing callback endpoints that allow the OAuth server to:

1. **Check** if an account link already exists
2. **Create** a new account link during authorization
3. **Get** account information after linking

This enables seamless account creation during the OAuth flow without requiring users to manually pre-register.

## Architecture

### Authorization URL Parameters

The authorization URL now includes three additional parameters that point to our account management endpoints:

```
https://{MERCHANT_IDLINK_DOMAIN}/authorize
  ?client_id={CLIENT_ID}
  &response_type=code
  &redirect_uri={CALLBACK_URL}
  &state={STATE}
  &scope=openid+profile+email+offline_access
  &prompt=consent
  &check={APP_BASE_URL}/api/ucp/account/check      ← NEW
  &create={APP_BASE_URL}/api/ucp/account/create    ← NEW
  &get={APP_BASE_URL}/api/ucp/account/get          ← NEW
```

### Streamlined Linking Endpoints

Three new endpoints handle account operations during the OAuth flow:

#### 1. Check Account (`POST /api/ucp/account/check`)

**Purpose**: Verify if a merchant identity is already linked to a chatbot user.

**Request**:

```json
{
  "assertion": "eyJhbGci...", // JWT with user identity
  "intent": "check"
}
```

**Response (Found)**:

```json
{
  "account_found": true,
  "user_id": "auth0|chatbot123",
  "linked_at": "2026-02-11T15:30:00.000Z"
}
```

**Response (Not Found)**:

```json
{
  "account_found": false
}
```

**Implementation**: `app/api/ucp/account/check/route.ts`

- Decodes JWT assertion to extract `sub` (merchant user ID)
- Queries `MerchantIdentityLink` table for existing link
- Returns whether account exists

#### 2. Create Account (`POST /api/ucp/account/create`)

**Purpose**: Create a new identity link between merchant and chatbot users.

**Authentication**: Requires active chatbot user session.

**Request**:

```json
{
  "assertion": "eyJhbGci...", // JWT with user identity
  "intent": "create",
  "refresh_token": "eyJhbGci..." // Optional
}
```

**Response (Success)**:

```json
{
  "success": true,
  "user_id": "auth0|chatbot123",
  "merchant_user_id": "auth0|merchant456",
  "linked_at": "2026-02-11T15:30:00.000Z",
  "message": "Account link created successfully"
}
```

**Response (Unauthenticated)**:

```json
{
  "error": "linking_error",
  "error_description": "User must be authenticated in chatbot to create account link",
  "login_hint": "Sign in to the chatbot first"
}
```

**Implementation**: `app/api/ucp/account/create/route.ts`

- Validates chatbot user authentication
- Decodes JWT assertion for merchant user ID
- Creates/updates `MerchantIdentityLink` record
- Stores refresh token if provided

#### 3. Get Account (`POST /api/ucp/account/get`)

**Purpose**: Retrieve account information for a linked identity.

**Request**:

```json
{
  "assertion": "eyJhbGci...", // JWT with user identity
  "intent": "get",
  "access_token": "eyJhbGci..." // Alternative to assertion
}
```

**Response (Success)**:

```json
{
  "user_id": "auth0|chatbot123",
  "merchant_user_id": "auth0|merchant456",
  "linked_at": "2026-02-11T15:30:00.000Z",
  "last_refreshed_at": "2026-02-11T16:00:00.000Z",
  "email": "user@example.com",
  "name": "John Doe"
}
```

**Response (Not Found)**:

```json
{
  "error": "linking_error",
  "error_description": "Account link not found"
}
```

**Implementation**: `app/api/ucp/account/get/route.ts`

- Accepts assertion or access_token
- Queries `MerchantIdentityLink` table
- Returns account information (excludes refresh token)

## Flow Diagram

```
1. User initiates checkout (authenticated in chatbot)
   ↓
2. CheckoutTool generates authorization URL with check/create/get endpoints
   ↓
3. User clicks identity linking URL
   ↓
4. OAuth server receives authorization request
   ↓
5. OAuth server calls CHECK endpoint with JWT assertion
   ├─ Account exists → Skip to step 8
   └─ Account not found → Continue to step 6
   ↓
6. OAuth server calls CREATE endpoint with JWT assertion
   ├─ User authenticated → Creates link
   └─ User not authenticated → Returns login_hint
   ↓
7. OAuth server proceeds with authorization
   ↓
8. User authorizes (if needed)
   ↓
9. OAuth server redirects to callback with authorization code
   ↓
10. Callback exchanges code for tokens (with optional intent parameter)
   ↓
11. Callback stores/updates identity link in database
   ↓
12. User redirected to success page
```

## Intent Parameter

The OAuth flow supports an optional `intent` parameter that can be passed through the authorization and token exchange:

- **check**: Verify account exists
- **create**: Create new account link
- **get**: Retrieve account information

The intent can be:

1. Included in query parameters to authorization endpoint
2. Passed to callback in query string
3. Sent to token exchange endpoint in request body
4. Returned in token response

**Example with Intent**:

```
/api/ucp/identity-linking/callback?code=xyz&state=abc&intent=create
```

The callback handler extracts the intent and passes it to the token exchange:

```typescript
const tokenData = await exchangeCodeForTokens(code, redirectUri, intent)
```

## Security Considerations

### JWT Validation

**Current Implementation**: Basic JWT decoding without signature verification.

**Production Requirements**:

- Verify JWT signatures using Auth0's public keys
- Validate issuer (`iss`) claim matches expected domain
- Check audience (`aud`) claim is correct
- Verify token hasn't expired (`exp` claim)
- Validate issued-at time (`iat` claim)

**Example**:

```typescript
import { createRemoteJWKSet, jwtVerify } from "jose"

const JWKS = createRemoteJWKSet(new URL(`https://${MERCHANT_IDLINK_DOMAIN}/.well-known/jwks.json`))

const { payload } = await jwtVerify(assertion, JWKS, {
  issuer: `https://${MERCHANT_IDLINK_DOMAIN}/`,
  audience: MERCHANT_IDLINK_CLIENT_ID,
})
```

### Authentication Requirements

- **Check endpoint**: No authentication required (read-only operation)
- **Create endpoint**: Requires active chatbot session (critical!)
- **Get endpoint**: No authentication required (uses JWT identity)

### Rate Limiting

**TODO**: Implement rate limiting on all account endpoints:

```typescript
// Example with rate-limit middleware
import rateLimit from "express-rate-limit"

const accountLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per window
})
```

### CORS Configuration

Account endpoints may be called from different origins (OAuth server). Configure appropriate CORS headers:

```typescript
headers: {
  "Access-Control-Allow-Origin": "https://trusted-oauth-server.com",
  "Access-Control-Allow-Methods": "POST",
  "Access-Control-Allow-Headers": "Content-Type",
}
```

## Testing

### Test Authorization URL

```bash
npx tsx test-idlink-url.ts
```

Expected output includes:

```
Streamlined Linking Endpoints:
- Check account: http://localhost:3000/api/ucp/account/check
- Create account: http://localhost:3000/api/ucp/account/create
- Get account: http://localhost:3000/api/ucp/account/get
```

### Test Check Endpoint

```bash
# Create test JWT (replace with actual token)
curl -X POST http://localhost:3000/api/ucp/account/check \
  -H "Content-Type: application/json" \
  -d '{
    "assertion": "eyJhbGci...",
    "intent": "check"
  }'
```

### Test Create Endpoint

**Prerequisites**: Must be authenticated in chatbot (have session cookie)

```bash
curl -X POST http://localhost:3000/api/ucp/account/create \
  -H "Content-Type: application/json" \
  -H "Cookie: appSession=..." \
  -d '{
    "assertion": "eyJhbGci...",
    "intent": "create",
    "refresh_token": "eyJhbGci..."
  }'
```

### Test Get Endpoint

```bash
curl -X POST http://localhost:3000/api/ucp/account/get \
  -H "Content-Type: application/json" \
  -d '{
    "assertion": "eyJhbGci...",
    "intent": "get"
  }'
```

## Database Schema

No changes required - streamlined linking uses the existing `MerchantIdentityLink` table:

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

## Code Changes

### Modified Files

- `lib/ai/tools/commerce.ts` - Added check/create/get parameters to authorization URL
- `app/api/ucp/identity-linking/callback/route.ts` - Added intent parameter support
- `test-idlink-url.ts` - Updated to show streamlined parameters

### New Files

- `app/api/ucp/account/check/route.ts` - Check account endpoint
- `app/api/ucp/account/create/route.ts` - Create account endpoint
- `app/api/ucp/account/get/route.ts` - Get account endpoint
- `STREAMLINED_LINKING.md` - This documentation

## Production Checklist

- [ ] **Implement JWT signature verification** (critical!)
- [ ] Add rate limiting to all account endpoints
- [ ] Configure CORS headers appropriately
- [ ] Use HTTPS for all callback URLs
- [ ] Add request validation and sanitization
- [ ] Implement comprehensive error handling
- [ ] Add logging for all account operations
- [ ] Set up monitoring and alerting
- [ ] Document API for external OAuth servers
- [ ] Add integration tests
- [ ] Perform security audit
- [ ] Load test account endpoints

## Benefits

### For Users

- ✅ Seamless account creation during OAuth flow
- ✅ No need to pre-register before linking
- ✅ Automatic account detection and reuse
- ✅ Reduced friction in checkout process

### For System

- ✅ Standards-compliant OAuth implementation
- ✅ Supports Google UCP requirements
- ✅ Extensible to other OAuth providers
- ✅ Maintains security boundaries

## References

- [Google OAuth with Sign-In Linking](https://developers.google.com/identity/account-linking/oauth-with-sign-in-linking)
- [Requirements for Streamlined Linking](https://developers.google.com/identity/account-linking/oauth-with-sign-in-linking#requirements_for_streamlined_linking)
- [Google UCP Identity Linking](https://developers.google.com/merchant/ucp/guides/identity-linking)
- [OAuth 2.0 RFC 6749](https://datatracker.ietf.org/doc/html/rfc6749)
