import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import * as incidentTools from "./incidentTools.js";
import { runToolHandler } from "./toolRuntime.js";

export function registerIncidentTools(server: McpServer) {
  // Create incident
  server.tool(
    "create_incident",
    "Create a new Sev1 incident record. Use when user asks to create, log, or open a new incident, Sev1, or critical issue.",
    {
      customerInfo: z.record(z.any()),
    },
    async ({ customerInfo }) => {
      return runToolHandler(
        "create_incident",
        { customerInfo },
        () => incidentTools.create_incident(customerInfo)
      );
    }
  );

  // Get incident
  server.tool(
    "get_incident",
    "Retrieve an incident by ID",
    {
      incidentId: z.string(),
    },
    async ({ incidentId }) => {
      return runToolHandler("get_incident", { incidentId }, () =>
        incidentTools.get_incident(incidentId)
      );
    }
  );

  // Update incident
  server.tool(
    "update_incident",
    "Update an existing incident",
    {
      incidentId: z.string(),
      updateData: z.record(z.any()),
    },
    async ({ incidentId, updateData }) => {
      return runToolHandler(
        "update_incident",
        { incidentId, updateData },
        () => incidentTools.update_incident(incidentId, updateData)
      );
    }
  );

  // List incidents
  server.tool(
    "list_incidents",
    "List all incidents (with optional filters)",
    {
      filters: z.record(z.any()).optional(),
    },
    async ({ filters }) => {
      return runToolHandler("list_incidents", { filters }, () =>
        incidentTools.list_incidents(filters)
      );
    }
  );
} 