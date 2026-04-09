import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import fs from "fs";
import path from "path";

export interface MCPTool {
  name: string;
  description: string;
  inputSchema?: Record<string, unknown>;
}

export class MCPClient {
  private client: Client;
  private transport: StdioClientTransport | null = null;
  private connected = false;
  private tools: MCPTool[] = [];
  private static instance: MCPClient | null = null;
  private connectPromise: Promise<void> | null = null;
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
    operation: string
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
        cursor ? { cursor } : undefined
      );
      const batch = (toolsResult.tools || []).map((tool: {
        name: string;
        description?: string;
        inputSchema?: Record<string, unknown>;
      }) => ({
        name: tool.name,
        description: tool.description ?? "",
        inputSchema: tool.inputSchema,
      }));
      aggregated.push(...batch);
      cursor = toolsResult.nextCursor;
    } while (cursor);
    this.tools = aggregated;
  }

  private async ensureHealthyConnection(): Promise<void> {
    if (!this.connected) {
      return;
    }
    await this.withTimeout(this.client.listTools(), this.healthTimeoutMs, "MCP health check");
  }

  /**
   * Connect to the MCP server process
   * @param serverScriptPath Absolute path to the MCP server build script (e.g., build/index.js)
   */
  async connect(serverScriptPath: string): Promise<void> {
    if (this.connectPromise) {
      return this.connectPromise;
    }

    this.connectPromise = (async () => {
      if (!serverScriptPath || typeof serverScriptPath !== "string") {
        throw new Error("MCP server script path is required");
      }

      if (!fs.existsSync(serverScriptPath)) {
        throw new Error(`MCP server script not found: ${serverScriptPath}`);
      }

      // Always verify connection health if already connected.
      if (this.connected) {
        try {
          await this.ensureHealthyConnection();
          return;
        } catch {
          this.connected = false;
        }
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

      this.transport = new StdioClientTransport({
        command,
        args: [serverScriptPath],
        cwd: serverCwd,
      });

      await this.withTimeout(
        this.client.connect(this.transport),
        this.connectTimeoutMs,
        "MCP connect"
      );

      this.connected = true;
      await this.refreshTools();
    })();

    try {
      await this.connectPromise;
    } catch (error) {
      this.connected = false;
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
    args: Record<string, unknown> = {}
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
        `Tool call: ${toolName}`
      );
      return response;
    } catch (error) {
      const message = String(error);

      // Attempt one recovery call if connection looks stale.
      if (
        message.includes("not connected") ||
        message.includes("closed") ||
        message.includes("ECONNRESET")
      ) {
        this.connected = false;
        throw new Error(`Tool ${toolName} failed due to stale connection: ${message}`);
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