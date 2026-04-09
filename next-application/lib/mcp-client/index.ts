import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import type { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";
import fs from "fs";
import path from "path";

import { getMcpServerPath } from "@/lib/mcp-server-path";
import {
  mcpTransportConfigKey,
  resolveMcpTransport,
  type ResolvedMcpTransport,
} from "@/lib/mcp-transport-config";

export interface MCPTool {
  name: string;
  description: string;
  inputSchema?: Record<string, unknown>;
}

export class MCPClient {
  private client: Client;
  private transport: Transport | null = null;
  private connected = false;
  private tools: MCPTool[] = [];
  private static instance: MCPClient | null = null;
  private connectPromise: Promise<void> | null = null;
  private lastConfigKey: string | null = null;
  private readonly connectTimeoutMs = 15000;
  private readonly toolTimeoutMs = 25000;
  private readonly healthTimeoutMs = 5000;

  constructor() {
    this.client = new Client({
      name: "nexsev-mcp-client",
      version: "1.0.0",
    });
  }

  /**
   * Get singleton instance of MCPClient
   */
  static getInstance(): MCPClient {
    if (!MCPClient.instance) {
      MCPClient.instance = new MCPClient();
    }
    return MCPClient.instance;
  }

  private withTimeout<T>(
    promise: Promise<T>,
    timeoutMs: number,
    operation: string,
  ): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`${operation} timed out after ${timeoutMs}ms`));
      }, timeoutMs);

      promise
        .then((result) => {
          clearTimeout(timer);
          resolve(result);
        })
        .catch((error) => {
          clearTimeout(timer);
          reject(error);
        });
    });
  }

  private async refreshTools(): Promise<void> {
    const aggregated: MCPTool[] = [];
    let cursor: string | undefined;
    do {
      const toolsResult = await this.client.listTools(
        cursor ? { cursor } : undefined,
      );
      const batch = (toolsResult.tools || []).map(
        (tool: {
          name: string;
          description?: string;
          inputSchema?: Record<string, unknown>;
        }) => ({
          name: tool.name,
          description: tool.description ?? "",
          inputSchema: tool.inputSchema,
        }),
      );
      aggregated.push(...batch);
      cursor = toolsResult.nextCursor;
    } while (cursor);
    this.tools = aggregated;
  }

  private async ensureHealthyConnection(): Promise<void> {
    if (!this.connected) {
      return;
    }
    await this.withTimeout(
      this.client.listTools(),
      this.healthTimeoutMs,
      "MCP health check",
    );
  }

  private createTransport(resolved: ResolvedMcpTransport): Transport {
    if (resolved.mode === "stdio") {
      const serverScriptPath = resolved.serverScriptPath;
      if (!serverScriptPath || typeof serverScriptPath !== "string") {
        throw new Error("MCP server script path is required for stdio transport");
      }
      if (!fs.existsSync(serverScriptPath)) {
        throw new Error(`MCP server script not found: ${serverScriptPath}`);
      }
      const isJs = serverScriptPath.endsWith(".js");
      const isPy = serverScriptPath.endsWith(".py");
      if (!isJs && !isPy) {
        throw new Error("Server script must be a .js or .py file");
      }
      const command = isPy
        ? process.platform === "win32"
          ? "python"
          : "python3"
        : process.execPath;
      const serverCwd = path.dirname(path.resolve(serverScriptPath));
      return new StdioClientTransport({
        command,
        args: [serverScriptPath],
        cwd: serverCwd,
      });
    }

    if (resolved.mode === "streamable-http") {
      return new StreamableHTTPClientTransport(resolved.url, {
        requestInit: resolved.requestInit,
      });
    }

    return new SSEClientTransport(resolved.url, {
      requestInit: resolved.requestInit,
    });
  }

  /**
   * Connect to the MCP server.
   *
   * - **Remote:** set `MCP_SERVER_URL` (Streamable HTTP by default; `MCP_TRANSPORT=sse` for legacy SSE servers).
   * - **Local stdio:** omit `MCP_SERVER_URL`; pass a script path or rely on `MCP_SERVER_PATH` / `getMcpServerPath()`.
   */
  async connect(serverScriptPath?: string): Promise<void> {
    if (this.connectPromise) {
      return this.connectPromise;
    }

    const scriptPath = serverScriptPath ?? getMcpServerPath();
    let resolved: ResolvedMcpTransport;
    try {
      resolved = resolveMcpTransport(scriptPath);
    } catch (e) {
      return Promise.reject(
        e instanceof Error ? e : new Error(String(e)),
      );
    }
    const configKey = mcpTransportConfigKey(resolved);

    this.connectPromise = (async () => {
      if (this.connected && this.lastConfigKey !== configKey) {
        await this.disconnect();
      }

      if (this.connected && this.lastConfigKey === configKey) {
        try {
          await this.ensureHealthyConnection();
          return;
        } catch {
          this.connected = false;
          try {
            await this.client.close();
          } catch {
            /* ignore */
          }
          this.transport = null;
        }
      }

      this.transport = this.createTransport(resolved);

      await this.withTimeout(
        this.client.connect(this.transport),
        this.connectTimeoutMs,
        "MCP connect",
      );

      this.connected = true;
      this.lastConfigKey = configKey;
      await this.refreshTools();
    })();

    try {
      await this.connectPromise;
    } catch (error) {
      this.connected = false;
      this.lastConfigKey = null;
      this.transport = null;
      try {
        await this.client.close();
      } catch {
        /* ignore */
      }
      throw new Error(`Failed to connect to MCP server: ${error}`);
    } finally {
      this.connectPromise = null;
    }
  }

  /**
   * List all available tools from the server
   */
  getAvailableTools(): MCPTool[] {
    return this.tools;
  }

  /**
   * Call a tool on the MCP server
   * @param toolName Name of the tool to call
   * @param args Arguments to pass to the tool
   */
  async callTool(
    toolName: string,
    args: Record<string, unknown> = {},
  ): Promise<unknown> {
    if (!this.connected) {
      throw new Error("Not connected to MCP server");
    }

    if (!toolName || typeof toolName !== "string") {
      throw new Error("Tool name must be a non-empty string");
    }

    if (args == null || typeof args !== "object" || Array.isArray(args)) {
      throw new Error("Tool arguments must be a JSON object");
    }

    try {
      const response = await this.withTimeout(
        this.client.callTool({
          name: toolName,
          arguments: args,
        }),
        this.toolTimeoutMs,
        `Tool call: ${toolName}`,
      );
      return response;
    } catch (error) {
      const message = String(error);

      if (
        message.includes("not connected") ||
        message.includes("closed") ||
        message.includes("ECONNRESET")
      ) {
        this.connected = false;
        throw new Error(
          `Tool ${toolName} failed due to stale connection: ${message}`,
        );
      }

      throw new Error(`Tool ${toolName} failed: ${message}`);
    }
  }

  /**
   * Disconnect from the MCP server
   */
  async disconnect(): Promise<void> {
    if (!this.client) return;
    try {
      await this.client.close();
    } catch {
      // Intentionally ignore disconnect errors.
    } finally {
      this.connected = false;
      this.transport = null;
      this.lastConfigKey = null;
      this.tools = [];
    }
  }

  /**
   * Check if client is connected
   */
  isConnected(): boolean {
    return this.connected;
  }
}
