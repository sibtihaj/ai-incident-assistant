import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Maps technical tool names to human-readable descriptions
 */
export const toolDisplayNames: Record<string, string> = {
  create_incident: "Create New Incidents",
  update_incident: "Update Incidents", 
  generate_can_document: "Generate CAN Documents",
  generate_rca_document: "Generate RCA Documents",
  get_can_templates: "View CAN Templates",
  get_rca_templates: "View RCA Templates",
  get_sev1_canvas_templates: "View Canvas Templates",
  load_template: "Load Specific Templates",
  list_incidents: "Search Incidents"
}

/**
 * Converts technical tool names to user-friendly display names
 */
export function getToolDisplayName(toolName: string): string {
  return toolDisplayNames[toolName] || toolName
}

/**
 * Gets all available tools with their display names
 */
export function getToolsWithDisplayNames(tools: Array<{name: string, description: string}>): Array<{name: string, displayName: string, description: string}> {
  return tools.map(tool => ({
    ...tool,
    displayName: getToolDisplayName(tool.name)
  }))
}
