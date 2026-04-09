## Learned User Preferences

- Prefer Context7 and relevant product skills (for example LangChain and Vercel) when checking current docs and implementation patterns.
- When the user asks to validate documentation, do that and adjust the plan before implementation rather than only validating while coding.
- For UI work, aim for distinctive interfaces (frontend-design skill direction) and avoid violet in the color palette.
- Use a human product name for branding and logo text such as IB AI assistant rather than placeholder-style labels like AI_Incident.
- Connection or agent status in the UI should reflect real reachability via Vercel AI Gateway, not a static online state.

## Learned Workspace Facts

- The product is named AI Incident Assistant.
- The stack targets Vercel AI Gateway for model access (replacing earlier Google or Ollama-oriented setups) and LangChain for orchestration and structured prompt or context handling instead of purely manual prompt engineering.
- MCP servers are being hardened; MCP gateway behavior and tool exposure should align with current best practices and documentation.
- The revamp emphasizes a LangChain orchestration layer, observability, and moving inference to Vercel AI Gateway for simpler deployment (marketing copy may contrast alternatives such as KServe on Kubernetes, Fireflies, Bedrock, or Google AI Gateway-style offerings).
- Hybrid observability uses LangSmith for trace-level runs, tool flows, and evals, while Vercel AI Gateway covers cost/latency/provider metrics; server code selects the app-level client via `OBSERVABILITY_PROVIDER` (for example langsmith) alongside standard LangSmith environment variables.
- When LangSmith tracing is enabled, the chat playground can surface trace references in the runtime logs panel for quick correlation with LangSmith.
- Pages of the application include text explanations of architecture and related concepts.
