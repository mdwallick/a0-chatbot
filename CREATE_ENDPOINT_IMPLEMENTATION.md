# /create Endpoint - User Creation Implementation

## Overview

The `/api/ucp/account/create` endpoint now implements **true streamlined linking** by creating new Auth0 users when needed.

## Two Scenarios

### Scenario 1: User IS Authenticated in Chatbot ✅
```
User clicks identity linking URL
  → Already signed into chatbot
  → /create called
  → Link EXISTING chatbot user to merchant
```

**Flow**:
1. Check session: User is authenticated
2. Get chatbot user ID from session
3. Create `MerchantIdentityLink` record
4. Return success with existing user ID

### Scenario 2: User is NOT Authenticated (NEW!) ✅
```
User clicks identity linking URL
  → NOT signed into chatbot
  → /create called
  → Create NEW Auth0 user
  → Link new user to merchant
```

**Flow**:
1. Check session: No authentication
2. Extract email/name from merchant JWT
3. **Create new user in Auth0** using Management API
4. Generate secure random password
5. Set `email_verified: false` (user gets verification email)
6. Create `MerchantIdentityLink` record
7. Return success with new user ID

## Implementation Details

### Auth0 Management API - Create User

```typescript
POST https://{AUTH0_DOMAIN}/api/v2/users
Authorization: Bearer {MANAGEMENT_TOKEN}
Content-Type: application/json

{
  "email": "user@example.com",
  "email_verified": false,
  "name": "User Name",
  "connection": "Username-Password-Authentication",
  "password": "{SECURE_RANDOM_32_CHAR_PASSWORD}",
  "verify_email": true
}
```

### Response Handling

**Success (201 Created)**:
```json
{
  "user_id": "auth0|new_chatbot_user_123",
  "email": "user@example.com",
  "email_verified": false,
  "created_at": "2026-02-11T17:00:00.000Z"
}
```

**User Already Exists (409 Conflict)**:
- Handled gracefully
- Searches for existing user by email
- Returns existing user for linking

### Password Generation

Secure 32-character random password:
- Charset: `a-z`, `A-Z`, `0-9`, special characters
- Generated using Node.js `crypto.randomBytes()`
- Never stored or logged
- User resets via "Forgot Password" flow

## Required Auth0 Scopes

The M2M client needs:
- ✅ `read:users` - Search for users
- ✅ **`create:users`** - Create new users (NEW!)

### Updating M2M Client Scopes

In Auth0 Dashboard:
1. Go to Applications → APIs → Auth0 Management API
2. Find your M2M client
3. Expand "Machine to Machine Applications"
4. Add permissions:
   - `read:users`
   - `create:users`
5. Save

## Verbose Debugging

All steps are logged:

```
[Account Create] ===== REQUEST RECEIVED =====
[Account Create] JWT claims decoded:
  - sub: auth0|merchant123
  - email: user@example.com
  - name: User Name
[Account Create] ===== SCENARIO 2: User NOT Authenticated =====
[Account Create] User is NOT signed into chatbot
  - Action: Create new Auth0 user
[Account Create] Creating new Auth0 user...
  - Email: user@example.com
  - Name: User Name
[Account Create] ✅ User created successfully:
  - User ID: auth0|chatbot456
  - Email: user@example.com
[Account Create] ===== Creating Identity Link =====
  - Chatbot user: auth0|chatbot456
  - Merchant user: auth0|merchant123
[Account Create] ✅ SUCCESS: Identity link created
```

## Complete Streamlined Linking Flow

```
1. User shops on merchant site (signed into merchant)
   ↓
2. User clicks checkout → Identity linking URL
   ↓
3. Merchant OAuth calls /check
   Response: account_found = false
   ↓
4. Merchant OAuth calls /create
   ↓
5. /create checks chatbot session
   ├─ Authenticated? → Link existing user
   └─ NOT authenticated? → Create NEW user in Auth0 ✅
   ↓
6. New user receives email verification
   ↓
7. Identity link created in database
   ↓
8. OAuth proceeds with authorization
   ↓
9. User redirected to callback
   ↓
10. Success! User can now use chatbot with linked merchant account
```

## Benefits

### 1. True Streamlined Linking ✅
No pre-registration required. Users are created automatically during OAuth.

### 2. Seamless User Experience ✅
```
OLD flow:
- User clicks link
- /create fails: "Sign in first"
- User must register on chatbot
- User must link again
- Friction!

NEW flow:
- User clicks link
- /create auto-creates chatbot account
- Link created automatically
- Done! ✅
```

### 3. Email Verification ✅
New users receive verification email automatically, ensuring valid email addresses.

### 4. Secure Passwords ✅
Random 32-character passwords that users never see. They use "Forgot Password" to set their own.

### 5. Duplicate Prevention ✅
- Checks if user exists first (409 handling)
- Uses email as unique identifier
- Links to existing user if found

## Security Considerations

### Password Security
- ✅ 32 characters, cryptographically random
- ✅ Never logged or stored in plain text
- ✅ Auth0 handles hashing automatically
- ✅ User gets verification email with password reset

### Email Verification
- ✅ New users start with `email_verified: false`
- ✅ Verification email sent automatically
- ✅ User must verify before full access

### Rate Limiting
- ⚠️ TODO: Add rate limiting to prevent abuse
- Limit account creation to prevent spam

### Input Validation
- ✅ Email format validation
- ✅ Required claims validation (sub, email)
- ✅ JWT decoding with error handling

## Testing

### Test User Creation

```bash
# Make sure dev server is running
npm run dev

# In another terminal, test the create endpoint
curl -X POST http://localhost:3000/api/ucp/account/create \
  -H "Content-Type: application/json" \
  -d '{
    "assertion": "MOCK_JWT_WITH_EMAIL",
    "intent": "create"
  }'
```

### Verify in Auth0

1. Go to Auth0 Dashboard → User Management → Users
2. Search for the newly created email
3. Verify user exists with:
   - ✅ Correct email
   - ✅ `email_verified: false`
   - ✅ Database connection
   - ✅ Recent creation date

### Verify in Database

```sql
SELECT * FROM "MerchantIdentityLink"
WHERE "chatbotUserId" = 'auth0|NEW_USER_ID';
```

Should show:
- Chatbot user ID (newly created)
- Merchant user ID (from JWT)
- Linked timestamp

## Error Handling

### User Already Exists (409)
```
[Account Create] Create user failed: {...}
[Account Create] User already exists (409), continuing...
[Account Create] Searching for existing user...
[Account Create] Found existing user: auth0|chatbot123
```

Result: Links existing user instead of failing.

### Missing Email Claim
```
[Account Create] ❌ ERROR: Missing required claims
Response: {
  "error": "invalid_assertion",
  "error_description": "Missing sub or email claim in assertion"
}
```

### Management API Failure
```
[Account Create] ❌ EXCEPTION: Failed to create user
Response: {
  "error": "server_error",
  "error_description": "Failed to create user: Unauthorized"
}
```

Check: M2M client has `create:users` scope.

## Comparison: Before vs After

### BEFORE ❌
```
/create endpoint:
- Requires user authentication
- Only links existing users
- Can't create new users
- Not true streamlined linking
```

### AFTER ✅
```
/create endpoint:
- Works with or without authentication
- Links existing users if authenticated
- Creates new users if not authenticated
- TRUE streamlined linking!
```

## Summary

The `/create` endpoint now:
- ✅ Detects if user is authenticated
- ✅ Creates NEW Auth0 users when needed
- ✅ Generates secure random passwords
- ✅ Sends email verification automatically
- ✅ Links user to merchant in database
- ✅ Handles duplicate user scenarios
- ✅ Verbose debugging for troubleshooting
- ✅ Implements Google's streamlined linking correctly

**This completes the streamlined linking implementation!** Users can now be created automatically during the OAuth flow without pre-registration.
