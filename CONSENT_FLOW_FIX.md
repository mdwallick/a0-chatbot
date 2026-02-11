# Consent Flow Resume Fix

## Problem

When users were prompted for consent (e.g., to access their Microsoft Calendar), the bot would successfully obtain consent but would NOT resume processing the original request. The consent popup would close, but the bot would stop instead of continuing to check the calendar.

## Root Cause

In `components/auth0-ai/FederatedConnections/popup.tsx`, the logic for handling the popup close event had a critical flaw:

```typescript
// BEFORE (BROKEN)
if (typeof onFinish === "function") {
  onFinish()
} else if (typeof resume === "function") {
  resume()
}
```

The `else if` created an either/or scenario:

- If `onFinish` exists → call it and SKIP `resume()`
- If `onFinish` doesn't exist → call `resume()`

However, the `resume()` function from Auth0 AI SDK is **critical** - it signals the AI to continue processing after the interruption. This should ALWAYS be called when consent is granted.

## Solution

Changed the logic to call BOTH functions independently:

```typescript
// AFTER (FIXED)
if (typeof resume === "function") {
  console.log("[Auth0 AI] Resuming AI processing after consent granted")
  resume()
} else {
  console.warn("[Auth0 AI] Resume function not available - AI will not continue")
}

if (typeof onFinish === "function") {
  onFinish()
}
```

Now:

1. ✅ `resume()` is ALWAYS called (if provided) to continue AI processing
2. ✅ `onFinish()` is called separately for UI cleanup
3. ✅ Console logging helps debug if `resume` is not provided

## Files Changed

- `components/auth0-ai/FederatedConnections/popup.tsx` - Fixed the resume logic

## How to Test

### Test Case: Microsoft Calendar Access

1. **Setup**: Ensure you have a Microsoft account linked but WITHOUT calendar permissions granted
2. **Action**: In the chat, ask: "What's on my calendar today?"
3. **Expected Flow**:
   - Bot detects it needs calendar permissions
   - Consent popup opens asking for calendar access
   - Grant the permission in the popup
   - Popup closes automatically
   - ✅ **Bot should continue and show your calendar events**

### Test Case: Google Drive Access

1. **Setup**: Ensure you have a Google account linked but WITHOUT Drive permissions
2. **Action**: In the chat, ask: "Find files in my Drive named 'budget'"
3. **Expected Flow**:
   - Bot detects it needs Drive permissions
   - Consent popup opens
   - Grant permission
   - ✅ **Bot should continue and search your Drive**

### Verification

Open browser console (F12) after granting consent. You should see:

```
[Auth0 AI] Resuming AI processing after consent granted
```

If you see the warning instead:

```
[Auth0 AI] Resume function not available - AI will not continue
```

This indicates the `resume` function is not being passed from the Auth0 AI SDK, which would be a deeper integration issue.

## Additional Notes

### Popup vs Redirect Mode

- **Popup Mode** (Desktop): Now fixed - bot resumes after consent
- **Redirect Mode** (Mobile): Uses full page redirect, which loses chat state
  - The redirect flow is handled by `components/auth0-ai/FederatedConnections/redirect.tsx`
  - This flow does NOT call `resume()` because the entire page reloads
  - On mobile, users may need to re-submit their question after granting consent

### Why This Matters

The Auth0 AI SDK's interruption system allows the AI to pause mid-execution to:

1. Request user consent
2. Gather additional permissions
3. Handle authentication challenges

The `resume()` function is the mechanism that tells the AI "you can continue now." Without calling it, the AI thinks the interruption is still active and stops processing.

### Integration with Auth0 AI SDK

The interrupt object comes from `useInterruptions()` hook in `components/chat.tsx`:

```typescript
const { toolInterrupt } = useInterruptions(handler =>
  useChat({...})
)
```

This integrates with `withInterruptions()` in `app/api/chat/route.ts`:

```typescript
return createDataStreamResponse({
  execute: withInterruptions(async dataStream => {
    const result = streamText({...})
  }, config)
})
```

## Future Improvements

1. **Better Mobile Experience**: Implement a state persistence mechanism for redirect mode so the original request can be resumed after page reload

2. **Retry Logic**: Add automatic retry if `resume()` fails to re-trigger AI processing

3. **User Feedback**: Show a visual indicator when the bot is resuming (e.g., "Resuming with new permissions...")

4. **Testing**: Add E2E tests for consent flow using tools like Playwright to simulate the popup flow
