import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import * as templateTools from "./templateTools.js";
import { runToolHandler } from "./toolRuntime.js";

export function registerTemplateTools(server: McpServer) {
  // Get CAN templates
  server.tool(
    "get_can_templates",
    "Get Customer Alert Notice (CAN) templates. Use when user asks for CAN templates, Customer Alert Notice templates, escalation templates, or wants to see available CAN formats.",
    {},
    async () => {
      return runToolHandler("get_can_templates", {}, () =>
        templateTools.get_can_templates()
      );
    }
  );

  // Get SEV1 Canvas templates
  server.tool(
    "get_sev1_canvas_templates",
    "Get SEV1 Canvas templates for incident management. Use when user asks for SEV1 Canvas, incident context, or technical detail templates.",
    {},
    async () => {
      return runToolHandler("get_sev1_canvas_templates", {}, () =>
        templateTools.get_sev1_canvas_templates()
      );
    }
  );

  // Get RCA templates
  server.tool(
    "get_rca_templates",
    "Get Root Cause Analysis (RCA) templates. Use when user asks for RCA templates, Root Cause Analysis templates, post-incident templates, or investigation templates.",
    {},
    async () => {
      return runToolHandler("get_rca_templates", {}, () =>
        templateTools.get_rca_templates()
      );
    }
  );

  // Load specific template
  server.tool(
    "load_template",
    "Load a specific template by ID. Use when user wants to load, get, fetch, or retrieve a particular template.",
    {
      templateId: z.string(),
    },
    async ({ templateId }) => {
      return runToolHandler("load_template", { templateId }, () =>
        templateTools.load_template(templateId)
      );
    }
  );

  // Generate CAN document
  server.tool(
    "generate_can_document",
    "Generate a Customer Alert Notice (CAN) document for escalation. Use when user requests to generate or create a CAN, Customer Alert Notice, or escalation document.",
    {
      incidentData: z.record(z.any()),
      templateId: z.string().optional().nullable(),
    },
    async ({ incidentData, templateId }) => {
      return runToolHandler("generate_can_document", { incidentData, templateId }, () =>
        templateTools.generate_can_document(incidentData, templateId || undefined)
      );
    }
  );

  // Generate RCA document
  server.tool(
    "generate_rca_document",
    "Generate a Root Cause Analysis (RCA) document post-incident. Use when user requests to generate or create an RCA, Root Cause Analysis, or post-incident report.",
    {
      incidentData: z.record(z.any()),
      templateId: z.string().optional().nullable(),
    },
    async ({ incidentData, templateId }) => {
      return runToolHandler("generate_rca_document", { incidentData, templateId }, () =>
        templateTools.generate_rca_document(incidentData, templateId || undefined)
      );
    }
  );
} 