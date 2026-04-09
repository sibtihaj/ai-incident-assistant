import { promises as fs } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Type definitions for templates
export interface Template {
  id: string;
  type?: "can" | "rca" | "sev1_canvas";
  name: string;
  description?: string;
  fields?: string[];
  content?: string;
  template?: Record<string, any>;
  required_fields?: string[];
  field_types?: Record<string, any>;
}

// Updated paths to match actual files
const CAN_TEMPLATES_PATH = path.join(__dirname, "../../data/templates/general_can_template.json");
const RCA_VAULT_TEMPLATE_PATH = path.join(__dirname, "../../data/templates/rca_vault_template.json");
const GENERAL_RCA_TEMPLATE_PATH = path.join(__dirname, "../../data/templates/general_rca_template.json");
const SEV1_CANVAS_PATH = path.join(__dirname, "../../data/templates/terraform-canvas.json");
const VAULT_DATASTORE_PATH = path.join(__dirname, "../../data/templates/vault_datastore_template.json");
const CONSUL_DATASTORE_PATH = path.join(__dirname, "../../data/templates/consul_datastore_template.json");

function assertObjectInput(value: unknown, field: string): asserts value is Record<string, any> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${field} must be a JSON object`);
  }
}

/**
 * List available Customer Alert Notice (CAN) templates.
 * Use when user asks for CAN templates, Customer Alert Notice templates, escalation templates, or wants to see available CAN formats.
 * @returns {Promise<Template[]>}
 */
export async function get_can_templates(): Promise<Template[]> {
  try {
    const data = await fs.readFile(CAN_TEMPLATES_PATH, "utf-8");
    const template = JSON.parse(data);
    
    // Convert to consistent format - handle the actual template structure
    return [{
      id: "CAN-001", // Match the template ID that the AI model expects
      name: "Customer Alert Notice Template",
      type: "can" as const,
      description: "Standard CAN template for escalation",
      template: template
    }];
  } catch (error) {
    console.error("Failed to read CAN templates:", error);
    return [];
  }
}

/**
 * List available SEV1 Canvas templates for incident management.
 * Use when user asks for SEV1 Canvas, incident context, or technical detail templates.
 * @returns {Promise<Template[]>}
 */
export async function get_sev1_canvas_templates(): Promise<Template[]> {
  try {
    const data = await fs.readFile(SEV1_CANVAS_PATH, "utf-8");
    const template = JSON.parse(data);
    
    return [{
      id: "sev1-canvas-1",
      name: "SEV1 Canvas Template",
      type: "sev1_canvas" as const,
      description: "Comprehensive incident canvas for Sev1 analysis",
      template: template
    }];
  } catch (error) {
    console.error("Failed to read SEV1 Canvas templates:", error);
    return [];
  }
}

/**
 * List available Root Cause Analysis (RCA) templates.
 * Use when user asks for RCA templates, Root Cause Analysis templates, or post-incident report templates.
 * @returns {Promise<Template[]>}
 */
export async function get_rca_templates(): Promise<Template[]> {
  try {
    const templates: Template[] = [];
    
    // Read RCA Vault template
    try {
      const rcaData = await fs.readFile(RCA_VAULT_TEMPLATE_PATH, "utf-8");
      const rcaTemplate = JSON.parse(rcaData);
      templates.push({
        id: "rca-vault-1",
        name: "RCA Vault Template",
        type: "rca" as const,
        description: "Root Cause Analysis template for Vault incidents",
        template: rcaTemplate
      });
    } catch (err) {
      console.error("Failed to read RCA Vault template:", err);
    }
    
    // Read Vault Datastore template
    try {
      const vaultData = await fs.readFile(VAULT_DATASTORE_PATH, "utf-8");
      const vaultTemplate = JSON.parse(vaultData);
      templates.push({
        id: "vault-datastore-1",
        name: "Vault Datastore Template",
        type: "rca" as const,
        description: "Detailed template for Vault datastore incidents",
        template: vaultTemplate
      });
    } catch (err) {
      console.error("Failed to read Vault Datastore template:", err);
    }
    
    // Read Consul Datastore template
    try {
      const consulData = await fs.readFile(CONSUL_DATASTORE_PATH, "utf-8");
      const consulTemplate = JSON.parse(consulData);
      templates.push({
        id: "consul-datastore-1",
        name: "Consul Datastore Template",
        type: "rca" as const,
        description: "Template for Consul datastore incidents",
        template: consulTemplate
      });
    } catch (err) {
      console.error("Failed to read Consul Datastore template:", err);
    }
    
    // Read Terraform RCA template
    try {
      const terraformData = await fs.readFile(GENERAL_RCA_TEMPLATE_PATH, "utf-8");
      const terraformTemplate = JSON.parse(terraformData);
      templates.push({
        id: "terraform-rca-1",
        name: "Terraform RCA Template",
        type: "rca" as const,
        description: "Root Cause Analysis template for Terraform Enterprise incidents",
        template: terraformTemplate
      });
    } catch (err) {
      console.error("Failed to read Terraform RCA template:", err);
    }
    
    return templates;
  } catch (error) {
    console.error("Failed to read RCA templates:", error);
    return [];
  }
}

/**
 * Load a specific template by ID (searches all template types).
 * Use when user requests a specific template by name or ID.
 * @param {string} templateId
 * @returns {Promise<Template | null>}
 */
export async function load_template(templateId: string): Promise<Template | null> {
  const allTemplates = [
    ...(await get_can_templates()),
    ...(await get_rca_templates()),
    ...(await get_sev1_canvas_templates()),
  ];
  return allTemplates.find(t => t.id === templateId) || null;
}

import { formatCANDocument, formatRCADocument } from '../utils/documentFormatters.js';

/**
 * Generate a Customer Alert Notice (CAN) document for escalation.
 * Use when user requests to generate or create a CAN, Customer Alert Notice, or escalation document.
 * @param {Record<string, any>} incidentData
 * @param {string} [templateId]
 * @returns {Promise<string>}
 */
export async function generate_can_document(incidentData: Record<string, any>, templateId?: string): Promise<string> {
  try {
    assertObjectInput(incidentData, "incidentData");

    const templates = await get_can_templates();
    const template = templateId 
      ? templates.find(t => t.id === templateId) 
      : templates[0];
    
    if (!template) {
      return "No CAN template found. Please ensure templates are properly configured.";
    }
    
    // Generate the complete document directly with provided data
    const canDocument = formatCANDocument(template, incidentData);
    
    let response = canDocument;
    response += `\n---\n`;
    response += `✅ **CAN Document Generated Successfully!**\n\n`;
    response += `The Customer Alert Notice document has been created with the provided information. Would you like to:\n\n`;
    response += `- Add any additional details or modifications?\n`;
    response += `- Generate an RCA (Root Cause Analysis) document next?\n`;
    response += `- Create an incident record for tracking?\n`;
    
    return response;
  } catch (error) {
    return `Error generating CAN document: ${error}`;
  }
}

/**
 * Generate a Root Cause Analysis (RCA) document post-incident.
 * Use when user requests to generate or create an RCA, Root Cause Analysis, or post-incident report.
 * @param {Record<string, any>} incidentData
 * @param {string} [templateId]
 * @returns {Promise<string>}
 */
export async function generate_rca_document(incidentData: Record<string, any>, templateId?: string): Promise<string> {
  try {
    assertObjectInput(incidentData, "incidentData");

    const templates = await get_rca_templates();
    const template = templateId 
      ? templates.find(t => t.id === templateId) 
      : templates[0];
    
    if (!template) {
      return "No RCA template found. Please ensure templates are properly configured.";
    }
    
    // Generate the complete document directly with provided data
    const rcaDocument = formatRCADocument(template, incidentData);
    
    let response = rcaDocument;
    response += `\n---\n`;
    response += `✅ **RCA Document Generated Successfully!**\n\n`;
    response += `The Root Cause Analysis document has been created with the provided information. Would you like to:\n\n`;
    response += `- Add any additional details or modifications?\n`;
    response += `- Generate a CAN (Customer Alert Notice) document?\n`;
    response += `- Create an incident record for tracking?\n`;
    
    return response;
  } catch (error) {
    return `Error generating RCA document: ${error}`;
  }
} 