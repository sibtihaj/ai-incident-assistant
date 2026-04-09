# MCP Server for AI Incident Assistant

This MCP server provides incident and template tools consumed by the Next.js chat API.

## Revamp Notes
- Tool registration now uses shared runtime handling (`src/tools/toolRuntime.ts`) for:
  - consistent success/error output
  - timeout boundaries for long-running handlers
  - centralized execution logging
- Incident persistence now uses safer write behavior (temp file + rename) to reduce corruption risk.
- Tool input validation was tightened for object payloads such as `incidentData`, `customerInfo`, and `updateData`.

## Main Components
- `src/index.ts` - MCP server bootstrap
- `src/tools/incidentTools.ts` - incident CRUD logic
- `src/tools/templateTools.ts` - CAN/RCA/template logic
- `src/tools/*ToolDefinitions.ts` - MCP tool registrations
- `src/tools/toolRuntime.ts` - shared tool execution wrapper

## Local Usage
```bash
npm install
npm run build
npm start
```

The server communicates via stdio and is launched by the frontend MCP client.

## Data Files
- `data/incidents.json`
- `data/templates/*.json`