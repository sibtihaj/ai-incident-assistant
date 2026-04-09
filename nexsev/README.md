# AI Incident Assistant (Next.js App)

This package contains the frontend and API route layer for AI Incident Assistant.

## What Changed In The Revamp
- Branding updated to **AI Incident Assistant**.
- Chat runtime migrated to **LangChain + Vercel AI Gateway**.
- Legacy direct Gemini/Ollama logic removed from the chat route.
- New routing:
  - `/` = landing page
  - `/chat` = incident chat workspace
- Shared architecture/deployment explanation now appears globally through layout.

## Core Files
- `app/page.tsx` - landing page
- `app/chat/page.tsx` - chat route
- `app/api/chat/route.ts` - server-side chat orchestration and tool loop
- `lib/ai/config.ts` - AI Gateway config/auth resolution
- `lib/ai/observability.ts` - LangSmith/Langfuse adapter entrypoint
- `lib/langchain/mcpTools.ts` - MCP tool conversion for LangChain
- `lib/mcp-client/index.ts` - MCP transport client (timeout/reliability hardened)

## Run Locally
```bash
npm install
npm run dev
```

## Environment Variables
- `AI_GATEWAY_MODEL` (example: `openai/gpt-5.4`)
- `VERCEL_OIDC_TOKEN` (preferred) or `AI_GATEWAY_API_KEY` (fallback)
- `AI_GATEWAY_BASE_URL` (optional, defaults to `https://ai-gateway.vercel.sh/v1`)
- `OBSERVABILITY_PROVIDER` (`langsmith`, `langfuse`, or omitted)

## Implementation Notes
- The API route intentionally remains server-side for secret safety and controlled tool execution.
- Prompt/context behavior still uses the existing prompt engine while model/tool orchestration now runs through LangChain.
