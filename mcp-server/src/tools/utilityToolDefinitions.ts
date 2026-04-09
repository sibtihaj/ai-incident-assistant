import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { runToolHandler } from "./toolRuntime.js";

export function registerUtilityTools(server: McpServer) {
  // List tools
  server.tool(
    "list_tools",
    "List all available tools and their descriptions. Use when user asks what tools are available, what you can do, or wants to see your capabilities.",
    {},
    async () => {
      return runToolHandler("list_tools", {}, async () => {
        const tools = [
          {
            name: "create_incident",
            description: "Create a new Sev1 incident record",
            usage: "Use when user asks to create, log, or open a new incident, Sev1, or critical issue"
          },
          {
            name: "get_incident", 
            description: "Retrieve an incident by ID",
            usage: "Use when user asks to get, fetch, or view a specific incident"
          },
          {
            name: "update_incident",
            description: "Update an existing incident",
            usage: "Use when user asks to update, modify, or add information to an incident"
          },
          {
            name: "list_incidents",
            description: "List all incidents in the system", 
            usage: "Use when user asks to see, list, or find all incidents"
          },
          {
            name: "get_can_templates",
            description: "Get Customer Alert Notice (CAN) templates",
            usage: "Use when user asks for CAN templates, Customer Alert Notice templates, or escalation templates"
          },
          {
            name: "get_rca_templates",
            description: "Get Root Cause Analysis (RCA) templates",
            usage: "Use when user asks for RCA templates, Root Cause Analysis templates, or post-incident templates"
          },
          {
            name: "get_sev1_canvas_templates",
            description: "Get SEV1 Canvas templates for incident management",
            usage: "Use when user asks for SEV1 Canvas, incident context, or technical detail templates"
          },
          {
            name: "load_template",
            description: "Load a specific template by ID",
            usage: "Use when user wants to load, get, fetch, or retrieve a particular template"
          },
          {
            name: "generate_can_document",
            description: "Generate a Customer Alert Notice (CAN) document for escalation",
            usage: "Use when user requests to generate or create a CAN, Customer Alert Notice, or escalation document"
          },
          {
            name: "generate_rca_document", 
            description: "Generate a Root Cause Analysis (RCA) document post-incident",
            usage: "Use when user requests to generate or create an RCA, Root Cause Analysis, or post-incident report"
          }
        ];
        
        const result = {
          available_tools: tools,
          total_count: tools.length,
          categories: {
            incident_management: ["create_incident", "get_incident", "update_incident", "list_incidents"],
            template_management: ["get_can_templates", "get_rca_templates", "get_sev1_canvas_templates", "load_template"],
            document_generation: ["generate_can_document", "generate_rca_document"]
          }
        };
        return result;
      });
    }
  );
} 