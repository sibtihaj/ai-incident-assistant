# AI Incident Assistant

AI Incident Assistant is a revamp of the previous incident chatbot into a production-oriented incident response workspace.

## Revamp Summary
- Rebranded from legacy Nexsev naming to **AI Incident Assistant**.
- Migrated model orchestration to **LangChain**.
- Migrated model access to **Vercel AI Gateway** (instead of direct Google/Ollama integration).
- Hardened MCP integration for stronger validation, timeout handling, and safer tool execution.
- Added a dedicated landing page at `/` and moved the chat workspace to `/chat`.

## How The Revamp Was Done
1. Replaced provider-specific orchestration in `nexsev/app/api/chat/route.ts` with LangChain message + tool flow.
2. Added AI Gateway config and observability abstraction in `nexsev/lib/ai/`.
3. Added LangChain MCP tool adapters in `nexsev/lib/langchain/mcpTools.ts`.
4. Hardened MCP tool runtime and definitions in `mcp-server/src/tools/`.
5. Updated frontend routing and branding (`nexsev/app/page.tsx`, `nexsev/app/chat/page.tsx`, `nexsev/components/chat/ChatInterface.tsx`, `nexsev/app/layout.tsx`).
6. Added shared architecture/deployment explanation visible across pages.

## Architecture
- **Frontend/App:** Next.js 15 + TypeScript (`nexsev/`)
- **LLM Orchestration:** LangChain (`@langchain/openai`, `@langchain/core`)
- **Model Gateway:** Vercel AI Gateway via OpenAI-compatible endpoint
- **Backend Tools:** MCP server (`mcp-server/`) exposed over stdio
- **Observability:** Adapter-style support for LangSmith or Langfuse

## Deployment Model
- Application is designed for **Vercel deployment**.
- AI Gateway authentication is **OIDC-first** (`VERCEL_OIDC_TOKEN`), with `AI_GATEWAY_API_KEY` fallback for non-Vercel contexts.

## Project Structure
```text
AI Incident Assistant/
  mcp-server/   # MCP tool server (incident/template/utility tools)
  nexsev/       # Next.js app (landing page, chat UI, API route)
  templates/    # Supporting assets/templates
```

## Local Setup
### Prerequisites
- Node.js 20+
- npm 9+

### 1) Install dependencies
```bash
cd mcp-server && npm install
cd ../nexsev && npm install
```

### 2) Build and start MCP server
```bash
cd ../mcp-server
npm run build
npm start
```

### 3) Start Next.js app
```bash
cd ../nexsev
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000).

## Required Environment Variables
In `nexsev`:
- `AI_GATEWAY_MODEL` (example: `openai/gpt-5.4`)
- `VERCEL_OIDC_TOKEN` (preferred on linked Vercel workflows) or `AI_GATEWAY_API_KEY`
- `AI_GATEWAY_BASE_URL` (optional, defaults to `https://ai-gateway.vercel.sh/v1`)
- `OBSERVABILITY_PROVIDER` (`langsmith`, `langfuse`, or omit for none)

## Notes
- The chat API route is intentionally server-side to keep secrets/tool execution secure.
- MCP tools remain the source of truth for incident/template operations.
