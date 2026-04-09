/**
 * Resolves how the app reaches the MCP server.
 *
 * - **stdio** (default): local subprocess via `MCP_SERVER_PATH` / `getMcpServerPath()`.
 * - **streamable-http**: MCP Streamable HTTP transport (POST + SSE). Preferred for remote servers
 *   (e.g. Cloudflare Workers) per current `@modelcontextprotocol/sdk` guidance; `SSEClientTransport` is deprecated.
 * - **sse**: legacy HTTP+SSE transport for older servers still on SSE-only endpoints.
 *
 * @see https://modelcontextprotocol.io/specification/2025-11-25/basic/transports
 */
export type McpTransportMode = "stdio" | "streamable-http" | "sse";

export type ResolvedMcpTransport =
  | {
      mode: "stdio";
      serverScriptPath: string;
    }
  | {
      mode: "streamable-http" | "sse";
      url: URL;
      requestInit: RequestInit;
    };

function firstNonEmpty(...values: (string | undefined)[]): string | undefined {
  for (const v of values) {
    const t = v?.trim();
    if (t) return t;
  }
  return undefined;
}

function parseExtraHeadersJson(raw: string | undefined): Record<string, string> {
  if (!raw?.trim()) return {};
  try {
    const parsed: unknown = JSON.parse(raw);
    if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {};
    }
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
      if (typeof v === "string" && k.trim()) {
        out[k.trim()] = v;
      }
    }
    return out;
  } catch {
    return {};
  }
}

/**
 * Build `RequestInit` for remote MCP (Authorization + optional JSON headers).
 */
export function buildMcpRemoteRequestInit(): RequestInit {
  const headers = new Headers();

  const bearer = firstNonEmpty(
    process.env.MCP_SERVER_BEARER_TOKEN,
    process.env.MCP_SERVER_AUTH_TOKEN,
    process.env.MCP_SERVER_API_KEY,
  );
  if (bearer) {
    headers.set("Authorization", bearer.startsWith("Bearer ") ? bearer : `Bearer ${bearer}`);
  }

  const extra = parseExtraHeadersJson(process.env.MCP_SERVER_HEADERS_JSON);
  for (const [k, v] of Object.entries(extra)) {
    headers.set(k, v);
  }

  return { headers };
}

function normalizeRemoteMode(raw: string | undefined): "streamable-http" | "sse" {
  const t = (raw?.trim() ?? "").toLowerCase();
  if (!t || t === "streamable-http" || t === "streamable_http" || t === "http") {
    return "streamable-http";
  }
  if (t === "sse" || t === "http+sse" || t === "legacy-sse") {
    return "sse";
  }
  if (t === "stdio") {
    throw new Error(
      "MCP_TRANSPORT=stdio cannot be used with MCP_SERVER_URL. Omit MCP_SERVER_URL for local stdio.",
    );
  }
  throw new Error(
    `Invalid MCP_TRANSPORT="${raw}". Use streamable-http (default), sse, or omit for remote.`,
  );
}

/**
 * Resolve transport from environment. Call on the server (Node) only.
 */
export function resolveMcpTransport(
  serverScriptPathForStdio: string,
): ResolvedMcpTransport {
  const urlStr = firstNonEmpty(process.env.MCP_SERVER_URL, process.env.MCP_REMOTE_URL);
  if (urlStr) {
    let url: URL;
    try {
      url = new URL(urlStr);
    } catch {
      throw new Error(`Invalid MCP_SERVER_URL (must be absolute URL): ${urlStr}`);
    }
    const mode = normalizeRemoteMode(process.env.MCP_TRANSPORT);
    return {
      mode,
      url,
      requestInit: buildMcpRemoteRequestInit(),
    };
  }

  return {
    mode: "stdio",
    serverScriptPath: serverScriptPathForStdio,
  };
}

/** Stable key to detect config changes across connects (singleton). */
export function mcpTransportConfigKey(resolved: ResolvedMcpTransport): string {
  if (resolved.mode === "stdio") {
    return `stdio:${resolved.serverScriptPath}`;
  }
  const headers = buildMcpRemoteRequestInit().headers;
  const headerSnap =
    headers instanceof Headers
      ? [...headers.entries()].sort(([a], [b]) => a.localeCompare(b)).join("|")
      : "";
  return `${resolved.mode}:${resolved.url.href}:${headerSnap}`;
}
