const DEFAULT_TOOL_TIMEOUT_MS = 12000;

type Serializable =
  | string
  | number
  | boolean
  | null
  | Serializable[]
  | { [key: string]: Serializable };

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Tool execution timed out after ${timeoutMs}ms`));
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

function normalizeToolOutput(result: unknown): string {
  if (typeof result === "string") {
    return result;
  }

  try {
    return JSON.stringify(result as Serializable, null, 2);
  } catch {
    return String(result);
  }
}

export async function runToolHandler<T>(
  toolName: string,
  args: Record<string, unknown>,
  handler: () => Promise<T>,
  timeoutMs: number = DEFAULT_TOOL_TIMEOUT_MS
): Promise<{ content: [{ type: "text"; text: string }] }> {
  try {
    const result = await withTimeout(handler(), timeoutMs);
    console.error(`[MCP TOOL] ${toolName} called with`, args, "Result:", result);
    return {
      content: [{ type: "text", text: normalizeToolOutput(result) }],
    };
  } catch (error) {
    console.error(`[MCP TOOL ERROR] ${toolName} called with`, args, "Error:", error);
    return {
      content: [{ type: "text", text: `Error: ${String(error)}` }],
    };
  }
}
