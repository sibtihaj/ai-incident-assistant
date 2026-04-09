import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod/v4";

type Incident = {
	id: string;
	timestamp: string;
	severity: string;
	customerInfo: Record<string, unknown>;
	investigation: unknown[];
	generatedDocs: {
		can?: string;
		rca?: string;
	};
	status: string;
};

const incidents: Incident[] = [];

function randomIncidentId(): string {
	return `SEV1-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}

function textContent(result: unknown): { content: [{ type: "text"; text: string }] } {
	return {
		content: [
			{
				type: "text",
				text: typeof result === "string" ? result : JSON.stringify(result, null, 2),
			},
		],
	};
}

function generateCanDocument(incidentData: Record<string, unknown>): string {
	const customer =
		typeof incidentData.customer === "string"
			? incidentData.customer
			: typeof incidentData.customerName === "string"
				? incidentData.customerName
				: "Customer";
	const description =
		typeof incidentData.incident_description === "string"
			? incidentData.incident_description
			: typeof incidentData.description === "string"
				? incidentData.description
				: "No description provided";
	const severity =
		typeof incidentData.severity === "string" ? incidentData.severity : "SEV1";
	const impact = typeof incidentData.impact === "string" ? incidentData.impact : "TBD";
	const status = typeof incidentData.status === "string" ? incidentData.status : "OPEN";

	return [
		"# CAN Report",
		"",
		`- Customer: ${customer}`,
		`- Severity: ${severity}`,
		`- Status: ${status}`,
		`- Date: ${new Date().toISOString()}`,
		"",
		"## Incident Summary",
		description,
		"",
		"## Customer Impact",
		impact,
	].join("\n");
}

function generateRcaDocument(incidentData: Record<string, unknown>): string {
	const incidentId = typeof incidentData.id === "string" ? incidentData.id : "TBD";
	const summary =
		typeof incidentData.description === "string"
			? incidentData.description
			: typeof incidentData.incident_description === "string"
				? incidentData.incident_description
				: "No summary provided";
	const rootCause =
		typeof incidentData.root_cause === "string"
			? incidentData.root_cause
			: typeof incidentData.rootCause === "string"
				? incidentData.rootCause
				: "Root cause pending";
	const timeline = typeof incidentData.timeline === "string" ? incidentData.timeline : "TBD";

	return [
		"# Root Cause Analysis (RCA)",
		"",
		`- Incident ID: ${incidentId}`,
		`- Date: ${new Date().toISOString()}`,
		"",
		"## Summary",
		summary,
		"",
		"## Root Cause",
		rootCause,
		"",
		"## Timeline",
		timeline,
	].join("\n");
}

function registerTools(server: McpServer): void {
	server.registerTool(
		"create_incident",
		{
			description: "Create a new Sev1 incident record",
			inputSchema: z.object({ customerInfo: z.record(z.string(), z.unknown()) }),
		},
		async ({ customerInfo }) => {
			const incident: Incident = {
				id: randomIncidentId(),
				timestamp: new Date().toISOString(),
				severity: "SEV1",
				customerInfo,
				investigation: [],
				generatedDocs: {},
				status: "OPEN",
			};
			incidents.push(incident);
			return textContent(incident);
		},
	);

	server.registerTool(
		"get_incident",
		{
			description: "Retrieve an incident by ID",
			inputSchema: z.object({ incidentId: z.string() }),
		},
		async ({ incidentId }) => {
			const found = incidents.find((i) => i.id === incidentId) ?? null;
			return textContent(found ?? { error: `Incident ${incidentId} not found` });
		},
	);

	server.registerTool(
		"update_incident",
		{
			description: "Update an existing incident",
			inputSchema: z.object({
				incidentId: z.string(),
				updateData: z.record(z.string(), z.unknown()),
			}),
		},
		async ({ incidentId, updateData }) => {
			const idx = incidents.findIndex((i) => i.id === incidentId);
			if (idx < 0) {
				return textContent({ error: `Incident ${incidentId} not found` });
			}
			const current = incidents[idx];
			incidents[idx] = {
				...current,
				...(updateData as Partial<Incident>),
				id: current.id,
				timestamp: current.timestamp,
			};
			return textContent(incidents[idx]);
		},
	);

	server.registerTool(
		"list_incidents",
		{
			description: "List incidents (optionally filtered by top-level keys)",
			inputSchema: z.object({
				filters: z.record(z.string(), z.unknown()).optional(),
			}),
		},
		async ({ filters }) => {
			if (!filters || Object.keys(filters).length === 0) {
				return textContent(incidents);
			}
			const filtered = incidents.filter((item) =>
				Object.entries(filters).every(([k, v]) => (item as Record<string, unknown>)[k] === v),
			);
			return textContent(filtered);
		},
	);

	server.registerTool(
		"get_can_templates",
		{
			description: "Get available CAN templates",
			inputSchema: z.object({}),
		},
		async () =>
			textContent([
				{
					id: "CAN-001",
					type: "can",
					name: "Customer Alert Notice Template",
					required_fields: [
						"customer",
						"incident_description",
						"severity",
						"status",
						"impact",
					],
				},
			]),
	);

	server.registerTool(
		"get_rca_templates",
		{
			description: "Get available RCA templates",
			inputSchema: z.object({}),
		},
		async () =>
			textContent([
				{
					id: "RCA-001",
					type: "rca",
					name: "Root Cause Analysis Template",
				},
			]),
	);

	server.registerTool(
		"get_sev1_canvas_templates",
		{
			description: "Get available SEV1 canvas templates",
			inputSchema: z.object({}),
		},
		async () =>
			textContent([
				{
					id: "SEV1-CANVAS-001",
					type: "sev1_canvas",
					name: "SEV1 Incident Canvas Template",
				},
			]),
	);

	server.registerTool(
		"load_template",
		{
			description: "Load a template by id",
			inputSchema: z.object({ templateId: z.string() }),
		},
		async ({ templateId }) =>
			textContent({
				id: templateId,
				message: "Template loaded (lightweight worker template catalog)",
			}),
	);

	server.registerTool(
		"generate_can_document",
		{
			description: "Generate a Customer Alert Notice document",
			inputSchema: z.object({
				incidentData: z.record(z.string(), z.unknown()),
				templateId: z.string().optional().nullable(),
			}),
		},
		async ({ incidentData }) => textContent(generateCanDocument(incidentData)),
	);

	server.registerTool(
		"generate_rca_document",
		{
			description: "Generate a Root Cause Analysis document",
			inputSchema: z.object({
				incidentData: z.record(z.string(), z.unknown()),
				templateId: z.string().optional().nullable(),
			}),
		},
		async ({ incidentData }) => textContent(generateRcaDocument(incidentData)),
	);

	server.registerTool(
		"list_tools",
		{
			description: "List available MCP tools",
			inputSchema: z.object({}),
		},
		async () =>
		textContent({
			tools: [
				"create_incident",
				"get_incident",
				"update_incident",
				"list_incidents",
				"get_can_templates",
				"get_rca_templates",
				"get_sev1_canvas_templates",
				"load_template",
				"generate_can_document",
				"generate_rca_document",
				"list_tools",
			],
		}),
	);
}

async function createStatelessTransport(): Promise<WebStandardStreamableHTTPServerTransport> {
	const server = new McpServer({
		name: "sev1-incident-worker",
		version: "1.0.0",
		capabilities: {
			tools: {},
		},
	});
	registerTools(server);

	const transport = new WebStandardStreamableHTTPServerTransport({
		sessionIdGenerator: undefined,
	});

	await server.connect(transport);
	return transport;
}

function jsonError(status: number, message: string): Response {
	return new Response(
		JSON.stringify({
			jsonrpc: "2.0",
			error: { code: -32000, message },
			id: null,
		}),
		{
			status,
			headers: {
				"content-type": "application/json",
				"access-control-allow-origin": "*",
				"access-control-allow-headers":
					"content-type,mcp-session-id,mcp-protocol-version,authorization",
				"access-control-allow-methods": "GET,POST,DELETE,OPTIONS",
			},
		},
	);
}

function isMcpPath(pathname: string): boolean {
	return pathname === "/" || pathname === "/mcp";
}

export default {
	async fetch(request: Request): Promise<Response> {
		try {
			const url = new URL(request.url);
			if (!isMcpPath(url.pathname)) {
				return new Response("Not Found", { status: 404 });
			}

			if (request.method === "OPTIONS") {
				return new Response(null, {
					status: 204,
					headers: {
						"access-control-allow-origin": "*",
						"access-control-allow-headers":
							"content-type,mcp-session-id,mcp-protocol-version,authorization",
						"access-control-allow-methods": "GET,POST,DELETE,OPTIONS",
					},
				});
			}

			if (
				request.method === "GET" &&
				!request.headers.get("mcp-session-id") &&
				url.pathname === "/"
			) {
				return Response.json(
					{
						status: "ok",
						service: "sev1-incident-worker",
						mcp_endpoint: `${url.origin}/mcp`,
						note: "Use POST/GET/DELETE MCP requests on /mcp with streamable-http transport.",
					},
					{
						headers: {
							"access-control-allow-origin": "*",
						},
					},
				);
			}

			if (request.method !== "POST") {
				return jsonError(405, "Only POST is supported in stateless mode.");
			}

			let parsedBody: unknown;
			try {
				parsedBody = await request.clone().json();
			} catch {
				return jsonError(400, "Invalid JSON request body.");
			}

			const transport = await createStatelessTransport();
			if (isInitializeRequest(parsedBody)) {
				return transport.handleRequest(request, { parsedBody });
			}
			return transport.handleRequest(request, { parsedBody });
		} catch (error) {
			const details = error instanceof Error ? error.message : String(error);
			return jsonError(500, `Worker internal error: ${details}`);
		}
	},
} satisfies ExportedHandler<Env>;
