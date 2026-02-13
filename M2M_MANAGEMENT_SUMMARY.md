# Auth0 M2M Management API - Complete Implementation

## Overview

All three streamlined linking endpoints now use the Auth0 Management API via M2M credentials to interact with the chatbot's Auth0 tenant.

## Endpoints Using M2M Management API

| Endpoint    | Operations                           | Required Scopes              |
| ----------- | ------------------------------------ | ---------------------------- |
| **/check**  | Search users by email (Lucene query) | `read:users`                 |
| **/create** | Create new users, Search users       | `create:users`, `read:users` |
| **/get**    | Fetch user profile by ID             | `read:users`                 |

## Complete Implementation

### 1. /check Endpoint

**Purpose**: Check if account exists by searching Auth0

**M2M Operations**:

1. Get Management API token
2. Search users by email (Lucene query)
3. Return first matching user

**Code Flow**:

```typescript
POST /api/ucp/account/check
  ↓
getManagementToken()
  → POST https://{domain}/oauth/token
  → Get access token with read:users scope
  ↓
searchUserByEmail(email)
  → GET https://{domain}/api/v2/users?q=email:"user@example.com"
  → Returns matching users
  ↓
Response: { account_found: true/false, user_id: "..." }
```

### 2. /create Endpoint

**Purpose**: Create new Auth0 user or link existing authenticated user

**M2M Operations**:

1. Get Management API token
2. Create new user in Auth0
3. Handle duplicate user (409) by searching

**Code Flow**:

```typescript
POST /api/ucp/account/create
  ↓
Check session
  ├─ Authenticated? → Use existing user
  └─ NOT authenticated? → Create new user
       ↓
     getManagementToken()
       → POST https://{domain}/oauth/token
       ↓
     createAuth0User(email, name)
       → POST https://{domain}/api/v2/users
       → Create user with random password
       → Send verification email
       ↓
     Get new user_id
  ↓
Create MerchantIdentityLink in database
  ↓
Response: { success: true, user_id: "...", merchant_user_id: "..." }
```

### 3. /get Endpoint

**Purpose**: Fetch complete user profile from Auth0

**M2M Operations**:

1. Get Management API token
2. Fetch user by ID from Auth0
3. Return complete profile

**Code Flow**:

```typescript
POST /api/ucp/account/get
  ↓
Find identity link in database
  ↓
getManagementToken()
  → POST https://{domain}/oauth/token
  ↓
getAuth0User(chatbotUserId)
  → GET https://{domain}/api/v2/users/{userId}
  → Returns complete user profile
  ↓
Response: {
  user_id, email, email_verified, name, picture,
  last_login, created_at, data_source: "auth0_management_api"
}
```

## Required M2M Client Configuration

### Environment Variables

```bash
AUTH0_DOMAIN="agentic-commerce-merchant.cic-demo-platform.auth0app.com"
AUTH0_CLIENT_ID_MGMT="jW6GvdcQl21nWzSRF30qJzJyesMUSnUf"
AUTH0_CLIENT_SECRET_MGMT="-jfk5RbqvAPBQA3PSYOvxmbMnq-6gcutVXxognDvIG2whVIWjZkWEFgTB86NqaJT"
AUTH0_AUDIENCE="https://agentic-commerce-merchant.cic-demo-platform.auth0app.com/api/v2/"
```

### Required Scopes

In Auth0 Dashboard → Applications → APIs → Auth0 Management API → Machine to Machine Applications:

Find client `jW6GvdcQl21nWzSRF30qJzJyesMUSnUf` and add:

- ✅ `read:users` - Search and fetch users
- ⚠️ **`create:users`** - Create new users (ADD THIS!)

## Auth0 Management API Calls Summary

### Token Request (All Endpoints)

```http
POST https://agentic-commerce-merchant.cic-demo-platform.auth0app.com/oauth/token
Content-Type: application/json

{
  "client_id": "jW6GvdcQl21nWzSRF30qJzJyesMUSnUf",
  "client_secret": "-jfk5Rbqv...",
  "audience": "https://agentic-commerce-merchant.cic-demo-platform.auth0app.com/api/v2/",
  "grant_type": "client_credentials"
}

Response:
{
  "access_token": "eyJhbGci...",
  "token_type": "Bearer",
  "expires_in": 86400
}
```

### Search Users by Email (/check)

```http
GET https://agentic-commerce-merchant.cic-demo-platform.auth0app.com/api/v2/users?q=email:"user@example.com"&search_engine=v3
Authorization: Bearer {token}

Response:
[
  {
    "user_id": "auth0|chatbot123",
    "email": "user@example.com",
    "email_verified": true,
    "name": "User Name",
    ...
  }
]
```

### Create User (/create)

```http
POST https://agentic-commerce-merchant.cic-demo-platform.auth0app.com/api/v2/users
Authorization: Bearer {token}
Content-Type: application/json

{
  "email": "user@example.com",
  "email_verified": false,
  "name": "User Name",
  "connection": "Username-Password-Authentication",
  "password": "{32-char random}",
  "verify_email": true
}

Response:
{
  "user_id": "auth0|new_user_456",
  "email": "user@example.com",
  "email_verified": false,
  "created_at": "2026-02-11T17:00:00.000Z",
  ...
}
```

### Get User by ID (/get)

```http
GET https://agentic-commerce-merchant.cic-demo-platform.auth0app.com/api/v2/users/auth0%7Cchatbot123
Authorization: Bearer {token}

Response:
{
  "user_id": "auth0|chatbot123",
  "email": "user@example.com",
  "email_verified": true,
  "name": "User Name",
  "picture": "https://...",
  "last_login": "2026-02-11T16:00:00.000Z",
  "created_at": "2026-01-15T10:00:00.000Z",
  ...
}
```

## Verbose Debugging Examples

### /check Output

```
================================================================================
[Account Check] ===== REQUEST RECEIVED =====
[Account Check] JWT claims decoded:
  - sub: auth0|merchant123
  - email: user@example.com
[Account Check] ===== STEP 1: Check Database Link =====
[Account Check] No existing database link found
[Account Check] ===== STEP 2: Search Auth0 by Email =====
[Account Check] Getting Auth0 Management API token...
[Account Check] Token received successfully
[Account Check] Searching Auth0 for user with email: user@example.com
[Account Check] Lucene query: email:"user@example.com"
[Account Check] Search returned 1 user(s)
[Account Check] ✅ FOUND: Matching user in chatbot Auth0
  - Chatbot user ID: auth0|chatbot456
  - Match method: email_lookup
[Account Check] Total processing time: 245 ms
================================================================================
```

### /create Output (New User)

```
================================================================================
[Account Create] ===== REQUEST RECEIVED =====
[Account Create] JWT claims decoded:
  - sub: auth0|merchant123
  - email: newuser@example.com
[Account Create] ===== SCENARIO 2: User NOT Authenticated =====
[Account Create] User is NOT signed into chatbot
  - Action: Create new Auth0 user
[Account Create] Getting Auth0 Management API token...
[Account Create] Management API token received
[Account Create] Creating new Auth0 user...
  - Email: newuser@example.com
  - Name: New User
[Account Create] ✅ User created successfully:
  - User ID: auth0|chatbot789
  - Email: newuser@example.com
[Account Create] ===== Creating Identity Link =====
  - Chatbot user: auth0|chatbot789
  - Merchant user: auth0|merchant123
[Account Create] ✅ SUCCESS: Identity link created
[Account Create] Total processing time: 512 ms
================================================================================
```

### /get Output

```
================================================================================
[Account Get] ===== REQUEST RECEIVED =====
[Account Get] JWT claims:
  - Merchant user ID: auth0|merchant123
[Account Get] ===== STEP 1: Find Identity Link =====
[Account Get] ✅ Identity link found:
  - Chatbot user ID: auth0|chatbot456
[Account Get] ===== STEP 2: Fetch Auth0 User Profile =====
[Account Get] Getting Auth0 Management API token...
[Account Get] Management API token received
[Account Get] Fetching Auth0 user details for: auth0|chatbot456
[Account Get] Auth0 user fetched:
  - User ID: auth0|chatbot456
  - Email: user@example.com
  - Email verified: true
  - Name: User Name
  - Last login: 2026-02-11T16:00:00.000Z
[Account Get] ✅ SUCCESS: Complete user profile retrieved
[Account Get] Processing time: 312 ms
================================================================================
```

## Benefits of Using M2M Management API

### 1. Complete User Data ✅

- /get returns actual Auth0 profile (email_verified, picture, last_login)
- Not just JWT claims
- Up-to-date information

### 2. True Streamlined Linking ✅

- /check searches existing users by email
- /create can create new users automatically
- /get fetches complete profile

### 3. Single Source of Truth ✅

- All user data comes from Auth0
- Database only stores links
- Auth0 is the authoritative user store

### 4. Consistency ✅

- All endpoints use same M2M client
- Consistent authentication pattern
- Reusable getManagementToken() function

## Security Considerations

### Token Caching (TODO)

Currently, each request gets a new Management API token. Consider caching:

```typescript
let cachedToken: { token: string; expiresAt: number } | null = null

async function getManagementToken() {
  if (cachedToken && cachedToken.expiresAt > Date.now()) {
    return cachedToken.token
  }

  const data = await fetchToken()
  cachedToken = {
    token: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000 - 60000, // 1 min buffer
  }

  return cachedToken.token
}
```

### Rate Limiting

Management API has rate limits. Consider:

- Caching token (reduces token requests)
- Caching user lookups (reduces search requests)
- Implementing request queuing

### Connection Configuration

Users are created in `Username-Password-Authentication` connection. To customize:

```typescript
const connection = process.env.AUTH0_DEFAULT_CONNECTION || "Username-Password-Authentication"
```

## Testing

### Test All Endpoints

```bash
# Start dev server
npm run dev

# Test /check
curl -X POST http://localhost:3000/api/ucp/account/check \
  -H "Content-Type: application/json" \
  -d '{"assertion":"JWT","intent":"check"}'

# Test /create (creates new user)
curl -X POST http://localhost:3000/api/ucp/account/create \
  -H "Content-Type: application/json" \
  -d '{"assertion":"JWT","intent":"create"}'

# Test /get
curl -X POST http://localhost:3000/api/ucp/account/get \
  -H "Content-Type: application/json" \
  -d '{"assertion":"JWT","intent":"get"}'
```

### Verify Logs

Watch for verbose debugging output showing all M2M API calls.

## Summary

✅ **All 3 endpoints now use Auth0 M2M Management API**:

- **/check** - Searches users by email
- **/create** - Creates new users
- **/get** - Fetches user profiles

✅ **Complete streamlined linking implementation**:

- Automatic user creation
- Email-based account matching
- Complete profile data

✅ **Verbose debugging** on all endpoints for troubleshooting

⚠️ **Action Required**: Add `create:users` scope to M2M client!
