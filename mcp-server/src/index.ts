import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerTemplateTools } from "./tools/templateToolDefinitions.js";
import { registerIncidentTools } from "./tools/incidentToolDefinitions.js";
import { registerUtilityTools } from "./tools/utilityToolDefinitions.js";

const server = new McpServer({
  name: "sev1-incident-server",
  version: "1.0.0",
  capabilities: {
    resources: {},
    tools: {},
  },
});

// Register all tools using the modular approach
registerTemplateTools(server);
registerIncidentTools(server);
registerUtilityTools(server);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Sev1 Incident MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error in main():", error);
  process.exit(1);
}); 