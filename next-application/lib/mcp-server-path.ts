import fs from "fs";
import path from "path";

/** Resolves MCP stdio server entry (build output). */
export function getMcpServerPath(): string {
  const configured = process.env.MCP_SERVER_PATH;
  if (configured) {
    return configured;
  }

  const possiblePaths = [
    path.resolve(process.cwd(), "../mcp-server/build/index.js"),
    path.resolve(process.cwd(), "../../mcp-server/build/index.js"),
    path.resolve(process.cwd(), "mcp-server/build/index.js"),
  ];

  for (const possiblePath of possiblePaths) {
    if (fs.existsSync(possiblePath)) {
      return possiblePath;
    }
  }

  return possiblePaths[0];
}
