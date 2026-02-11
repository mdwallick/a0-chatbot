# liteLLM Migration Summary

This document summarizes the changes made to switch from direct OpenAI API usage to liteLLM proxy.

## Changes Made

### 1. New Files Created

#### `lib/litellm.ts`

- Created liteLLM provider instance using `createOpenAI()` from Vercel AI SDK
- Configured with `LITELLM_API_KEY` and `LITELLM_BASE_URL`
- Set to `compatibility: "compatible"` mode for 3rd party provider support

### 2. Files Modified

#### `app/api/chat/route.ts`

- **Line 27**: Changed import from `@ai-sdk/openai` to `@/lib/litellm`
- **Line 173**: Changed `openai()` call to `litellm()`

#### `lib/summarize-thread.ts`

- **Line 2**: Changed import from `@ai-sdk/openai` to `@/lib/litellm`
- **Line 9**: Changed `openai()` call to `litellm()`

#### `lib/ai/tools/dalle.ts`

- **Lines 8-10**: Updated OpenAI client configuration to use liteLLM
- Added documentation note about image generation requirements

#### `env.sample`

- Replaced `OPENAI_API_KEY` with `LITELLM_API_KEY`
- Added `LITELLM_BASE_URL` configuration
- Updated comments to reflect liteLLM usage

#### `.github/workflows/lint.yml`

- **Lines 36-37**: Updated environment variables for CI/CD
- Changed `OPENAI_API_KEY` to `LITELLM_API_KEY`
- Added `LITELLM_BASE_URL` dummy value

#### `README.md`

- Updated setup instructions to mention liteLLM instead of OpenAI Platform

#### `CONTRIBUTING.md`

- Updated environment variable documentation
- Replaced OpenAI references with liteLLM

#### `CLAUDE.md`

- Updated Core Tech Stack section
- Updated Environment Variables section
- Added new "liteLLM Integration" section with configuration details

## Next Steps

### 1. Update Your `.env.local` File

Replace:

```bash
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o-mini
```

With:

```bash
LITELLM_API_KEY=your-litellm-virtual-key
LITELLM_BASE_URL=https://your-litellm-instance.com
OPENAI_MODEL=gpt-4o-mini
```

### 2. Verify liteLLM Configuration

Ensure your liteLLM instance is configured with:

- ✅ Chat completion support (for main chat and summarization)
- ✅ Function/tool calling support (for AI tools)
- ✅ Streaming support (for real-time chat responses)
- ⚠️ Image generation support (DALL-E) - see note below

### 3. Model Routing

Verify these models are available in your liteLLM instance:

- `gpt-4o` - Used for thread summarization
- `gpt-4o-mini` (or your configured model) - Used for main chat
- `dall-e-2` - Used for image generation

### 4. Image Generation Fallback (If Needed)

If your liteLLM instance **doesn't support DALL-E**, you can keep a direct OpenAI connection just for images:

1. Add to `.env.local`:

   ```bash
   OPENAI_API_KEY=sk-...  # Direct OpenAI key for images only
   ```

2. Update `lib/ai/tools/dalle.ts`:
   ```typescript
   const openai = new OpenAI({
     apiKey: process.env.OPENAI_API_KEY, // Use direct key
     // Remove baseURL line
   })
   ```

### 5. Testing Checklist

Test the following functionality:

- [ ] Basic chat interactions
- [ ] Thread summarization (check thread titles in sidebar)
- [ ] Image generation with DALL-E
- [ ] Tool calling (Google, Microsoft, Salesforce, Xbox tools)
- [ ] Streaming responses
- [ ] Auth0 interruptions for consent flows

### 6. Monitoring

Watch for these potential issues:

- Rate limiting (liteLLM has its own rate limits)
- Token refresh failures in Auth0 AI SDK
- Tool calling format compatibility
- Streaming response format differences

## Rollback Instructions

If you need to revert to direct OpenAI:

1. Restore environment variables:

   ```bash
   OPENAI_API_KEY=sk-...
   OPENAI_MODEL=gpt-4o-mini
   ```

2. In `app/api/chat/route.ts` and `lib/summarize-thread.ts`:

   ```typescript
   import { openai } from "@ai-sdk/openai"
   // Use openai() instead of litellm()
   ```

3. In `lib/ai/tools/dalle.ts`:
   ```typescript
   const openai = new OpenAI({
     apiKey: process.env.OPENAI_API_KEY,
   })
   ```

## Additional Resources

- [liteLLM Documentation](https://docs.litellm.ai/)
- [liteLLM Proxy Setup](https://docs.litellm.ai/docs/proxy/quick_start)
- [Vercel AI SDK OpenAI Provider](https://sdk.vercel.ai/providers/ai-sdk-providers/openai)
- [OpenAI Compatibility in liteLLM](https://docs.litellm.ai/docs/proxy/openai_compatible)

## Support

If you encounter issues:

1. Check liteLLM proxy logs for errors
2. Verify API key and base URL are correct
3. Test liteLLM endpoint directly with curl
4. Check model availability in your liteLLM config
