# Correct Interpretation of Google's Streamlined Identity Linking

## Overview

This document explains how we've mapped Google's streamlined identity linking pattern to work with Auth0 as the merchant OAuth provider and a chatbot/shopping assistant as the partner service.

## Google's Pattern

In Google's streamlined linking:
- **Google** acts as the OAuth provider (like our Auth0 merchant)
- **Partner** provides services (like our chatbot/shopping assistant)
- Users have a **Google account** (like our merchant account)
- Users may or may not have a **Partner account** (like our chatbot account)

## The Key Insight

**The `/check` endpoint doesn't just check for existing links - it checks if a user account exists in the partner system.**

### Why Email Matching?

When the merchant OAuth server calls `/check`, it's asking:

> "Does a chatbot user account already exist for this person?"

The merchant knows the user by their merchant identity (email, sub, etc.). The chatbot knows users by their chatbot identity (Auth0 user_id in the chatbot tenant).

**Email is the common identifier** that links these two identities.

## Our Implementation

### Step 1: Database Link Check
```typescript
// Check if merchant user is already explicitly linked
const existingLink = await prisma.merchantIdentityLink.findFirst({
  where: { merchantUserId: merchantUserId }
})

if (existingLink) {
  return { account_found: true, user_id: chatbotUserId }
}
```

**Meaning**: "Has this merchant user already been linked to a chatbot user?"

### Step 2: Email Lookup (NEW!)
```typescript
// Search chatbot Auth0 tenant for user with same email
const chatbotUser = await searchUserByEmail(merchantEmail)

if (chatbotUser) {
  return {
    account_found: true,
    user_id: chatbotUser.user_id,
    match_method: "email_lookup"
  }
}
```

**Meaning**: "Does a chatbot user with this email already exist?"

## The Complete Flow

```
Merchant OAuth Server (Auth0)          Chatbot Webhooks
========================               =================

User: merchant@example.com             User: merchant@example.com
      ↓                                      ↓
1. Generate JWT assertion
   { sub: "auth0|merchant123",
     email: "merchant@example.com" }
      ↓
2. Call /check webhook              →    3. Check database for link
                                              WHERE merchantUserId = "auth0|merchant123"
                                              Result: NOT FOUND
                                          ↓
                                          4. Search Auth0 for email
                                              Lucene: email:"merchant@example.com"
                                              Result: FOUND!
                                              { user_id: "auth0|chatbot456" }
                                          ↓
                                   ←    5. Return account_found: true
{ account_found: true,                     user_id: "auth0|chatbot456"
  user_id: "auth0|chatbot456" }            match_method: "email_lookup"
      ↓
6. Skip /create - account exists!
      ↓
7. Continue with OAuth authorization
```

## Why This Is Correct

### Google's Documentation Says:

> "The Check endpoint should determine whether the user's Google account corresponds to an existing account in your service."

**Translation**: Check if the merchant user (Google = merchant) has an account in your service (your service = chatbot).

### How to Check?

**By email!** Email is the universal identifier.

- Merchant OAuth server provides: `{ sub: "merchant_id", email: "user@example.com" }`
- Chatbot checks: "Do I have a user with email `user@example.com`?"
- If yes: They already have an account, link them automatically
- If no: Need to create a new account/link

## Benefits of This Approach

### 1. **Seamless User Experience**
```
User has:
✓ Merchant account (merchant@example.com)
✓ Chatbot account (merchant@example.com)
✗ No explicit link between them

Old flow:
- Check: account_found = false
- Create: User must sign into chatbot
- Manual linking required

New flow:
- Check: Finds chatbot user by email
- Check: account_found = true ✅
- Automatic linking!
```

### 2. **Prevents Duplicate Accounts**

Without email lookup:
```
User links merchant → Creates new chatbot account
User already had chatbot account → Now has TWO accounts!
```

With email lookup:
```
User links merchant → Finds existing chatbot account
User already had chatbot account → Links to existing account ✅
```

### 3. **Matches Google's Intent**

Google's streamlined linking is designed to:
- Detect existing accounts automatically
- Link accounts seamlessly
- Avoid duplicate accounts
- Reduce friction

Our email lookup does exactly this!

## Technical Details

### Auth0 Management API

We use the chatbot's M2M credentials to search its own Auth0 tenant:

```typescript
// Get M2M token
const token = await getManagementToken()

// Lucene search for user by email
const query = `email:"${email}"`
const response = await fetch(
  `https://${domain}/api/v2/users?q=${query}&search_engine=v3`,
  { headers: { Authorization: `Bearer ${token}` } }
)
```

### Required Scopes

The M2M client needs:
- ✅ `read:users` - To search for users by email

### Verbose Debugging

The updated `/check` endpoint logs:
```
[Account Check] ===== REQUEST RECEIVED =====
[Account Check] JWT claims decoded:
  - sub: auth0|merchant123
  - email: merchant@example.com
[Account Check] ===== STEP 1: Check Database Link =====
[Account Check] No existing database link found
[Account Check] ===== STEP 2: Search Auth0 by Email =====
[Account Check] Lucene query: email:"merchant@example.com"
[Account Check] ✅ FOUND: Matching user in chatbot Auth0
  - Chatbot user ID: auth0|chatbot456
  - Match method: email_lookup
```

## Comparison: Old vs New

### OLD: Database-Only Check
```typescript
POST /api/ucp/account/check
{ assertion: "JWT{email: user@example.com}" }

Response:
{ account_found: false }  // ❌ Even though user exists!
```

### NEW: Database + Email Lookup
```typescript
POST /api/ucp/account/check
{ assertion: "JWT{email: user@example.com}" }

Response:
{
  account_found: true,     // ✅ Found by email!
  user_id: "auth0|chatbot123",
  match_method: "email_lookup"
}
```

## Testing

### Test the Check Webhook
```bash
npx tsx test-check-webhook.ts
```

This simulates what the merchant OAuth server sends and shows:
1. JWT assertion decoding
2. Database link check
3. Auth0 email lookup
4. Final result with match method

### Expected Output

**If user exists in chatbot Auth0**:
```
✅ ACCOUNT FOUND!
  - Chatbot User ID: auth0|chatbot123
  - Match Method: email_lookup
  - Email: user@example.com

This means:
  → Chatbot user exists with same email
  → Can automatically link accounts
  → No new account creation needed
```

**If user doesn't exist**:
```
❌ ACCOUNT NOT FOUND
  - Merchant User ID: auth0|merchant456
  - Merchant Email: user@example.com

This means:
  → No existing link in database
  → No chatbot user with this email
  → Need to call /create endpoint
```

## Summary

**Correct interpretation**: ✅

The `/check` webhook should:
1. ✅ Check database for existing link (by merchant user ID)
2. ✅ Search Auth0 for user by email (by email)
3. ✅ Return `account_found: true` if either is found

This implements Google's streamlined linking correctly by detecting existing accounts automatically and enabling seamless account linking without creating duplicates.

## References

- [Google OAuth with Sign-In Linking](https://developers.google.com/identity/account-linking/oauth-with-sign-in-linking)
- [Google UCP Identity Linking](https://developers.google.com/merchant/ucp/guides/identity-linking)
- [Auth0 Management API - User Search](https://auth0.com/docs/api/management/v2#!/Users/get_users)
- [Auth0 Lucene Query Syntax](https://auth0.com/docs/users/user-search/user-search-query-syntax)
