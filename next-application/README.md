# AI Incident Assistant (Next.js App)

This package contains the frontend and API route layer for AI Incident Assistant.

## What Changed In The Revamp
- Branding updated to **AI Incident Assistant**.
- Chat runtime migrated to **LangChain + Vercel AI Gateway**.
- Legacy direct Gemini/Ollama logic removed from the chat route.
- New routing:
  - `/` = landing page
  - `/chat` = incident chat playground
- `/observability` = signed-in dashboard for gateway credits/report APIs, LangSmith root runs, and live health
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
- `AI_GATEWAY_MODEL` (example: `openai/gpt-5-nano`)
- `VERCEL_OIDC_TOKEN` (preferred) or `AI_GATEWAY_API_KEY` (fallback)
- `AI_GATEWAY_BASE_URL` (optional, defaults to `https://ai-gateway.vercel.sh/v1`)
- `OBSERVABILITY_PROVIDER` (`langsmith`, `langfuse`, or omitted)

### Observability (Vercel AI Gateway + LangSmith)

When signed in, open **`/observability`** in the app for an in-browser snapshot: gateway credits, 7-day spend report (by model, when the reporting API is enabled for your account), recent LangSmith root runs, live gateway/MCP health, and chat quota.

This app uses a **hybrid** setup:

| Layer | What it is good for |
|------|----------------------|
| **Vercel AI Gateway** | Spend, model usage, latency (TTFT), team/project dashboards — no extra code beyond routing through the gateway. |
| **LangSmith** | End-to-end **traces** for `POST /api/chat`: intent, quota metadata, MCP tool steps, errors, and timing. |

**Enable LangSmith tracing**

1. Create a project and API key in [LangSmith](https://smith.langchain.com).
2. In `.env.local` set:
   - `OBSERVABILITY_PROVIDER=langsmith`
   - `LANGSMITH_TRACING=true`
   - `LANGSMITH_API_KEY=...`
   - `LANGSMITH_PROJECT=ib-ai-incident-assistant` (or your project name)

Aliases `LANGCHAIN_TRACING_V2` / `LANGCHAIN_API_KEY` are also supported by the SDK.

Successful chat responses include **non-secret** `metadata.langsmith` (`traceId`, `rootRunId`, `projectName`, `langsmithHost`) so the playground runtime log can point you to the right trace.

**Portfolio: dataset + offline evaluation**

```bash
# One-time: upload example prompts to a LangSmith dataset
npm run langsmith:seed-dataset

# Run an experiment (keyword smoke eval against gateway — uses same AI_* env as the app)
npm run langsmith:evaluate
```

Optional: `LANGSMITH_INCIDENT_DATASET=my-dataset` to override the default dataset name.
- `ALLOW_PROMPT_EDITOR` — set to `true` to enable `/settings` and `GET`/`PUT` `/api/settings/*` (prompt/context JSON on disk locally; use durable storage on serverless prod)
- `NEXT_PUBLIC_ALLOW_PROMPT_EDITOR` — set to `true` to show the Settings nav link (optional; API still requires `ALLOW_PROMPT_EDITOR`)

### Supabase (auth + chat sessions + quota)
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` — browser and server clients; session cookies refreshed in middleware.
- `SUPABASE_SERVICE_ROLE_KEY` — **server-only**; used by `npm run seed:admin` (never expose to the client).

### Login CAPTCHA (Cloudflare Turnstile)
- `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY` — widget + siteverify on `POST /api/auth/login`.
- `CAPTCHA_COOKIE_SECRET` — HMAC secret for signed httpOnly `login_captcha_proof` (20-minute window) so users can retry password without solving Turnstile again until expiry. **Required in production** (falls back to `TURNSTILE_SECRET_KEY` in dev only if unset).

### Chat quota
- Optional `CHAT_QUOTA_MAX` (default `15`), `CHAT_QUOTA_WINDOW_HOURS` (default `24`) — enforced server-side on `POST /api/chat` via Supabase RPC; limit is per `auth.uid()`, not the device cookie (device id is audit-only).

### Seed admin (local/dev)
```bash
npm run seed:admin
```
Creates `admin@noemail.com` / `admin` if missing (uses Admin API). **Rotate the password** for any shared environment; treat as dev-only credentials.

## Implementation Notes
- The API route intentionally remains server-side for secret safety and controlled tool execution.
- Prompt assembly uses a thin system prompt plus LangChain `trimMessages` for bounded history; tool loops use the Vercel AI SDK with MCP-backed `dynamicTool` definitions.
- Operator docs: `/architecture` (overview + Mermaid diagrams), `/flow` (Chat Flow Diagram: end-to-end request and tool-selection narrative).
