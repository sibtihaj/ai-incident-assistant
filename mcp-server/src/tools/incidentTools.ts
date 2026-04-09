import { z } from "zod";
import { promises as fs } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to incidents data file
const INCIDENTS_PATH = path.join(__dirname, "../../data/incidents.json");
let writeQueue: Promise<void> = Promise.resolve();

// Type definitions for incident data
export interface Incident {
  id: string;
  timestamp: string;
  severity: string;
  customerInfo: Record<string, any>;
  investigation: any[];
  generatedDocs: {
    can?: string;
    rca?: string;
  };
  status: string;
}

/**
 * Load incidents from JSON file
 */
async function loadIncidents(): Promise<Incident[]> {
  try {
    const data = await fs.readFile(INCIDENTS_PATH, "utf-8");
    const parsed = JSON.parse(data);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error("Failed to load incidents, returning empty array:", error);
    return [];
  }
}

/**
 * Save incidents to JSON file
 */
async function saveIncidents(incidents: Incident[]): Promise<void> {
  writeQueue = writeQueue.then(async () => {
    const tempPath = `${INCIDENTS_PATH}.tmp`;
    await fs.writeFile(tempPath, JSON.stringify(incidents, null, 2));
    await fs.rename(tempPath, INCIDENTS_PATH);
  });

  try {
    await writeQueue;
  } catch (error) {
    console.error("Failed to save incidents:", error);
    throw error;
  }
}

/**
 * Generate unique incident ID
 */
function generateIncidentId(): string {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1000);
  return `SEV1-${timestamp}-${random}`;
}

/**
 * Create a new Sev1 incident record.
 * Use when user asks to create, log, or open a new incident, Sev1, or critical issue.
 * @param {Record<string, any>} customerInfo
 * @returns {Promise<Incident>}
 */
export async function create_incident(customerInfo: Record<string, any>): Promise<Incident> {
  try {
    if (!customerInfo || typeof customerInfo !== "object" || Array.isArray(customerInfo)) {
      throw new Error("customerInfo must be a JSON object");
    }

    const incidents = await loadIncidents();
    
    const newIncident: Incident = {
      id: generateIncidentId(),
      timestamp: new Date().toISOString(),
      severity: "SEV1",
      customerInfo,
      investigation: [],
      generatedDocs: {},
      status: "OPEN"
    };
    
    incidents.push(newIncident);
    await saveIncidents(incidents);
    
    return newIncident;
  } catch (error) {
    throw new Error(`Failed to create incident: ${error}`);
  }
}

/**
 * Retrieve an incident by ID.
 * Use when user requests to view, fetch, or get details of a specific incident by ID.
 * @param {string} incidentId
 * @returns {Promise<Incident | null>}
 */
export async function get_incident(incidentId: string): Promise<Incident | null> {
  try {
    const incidents = await loadIncidents();
    return incidents.find(incident => incident.id === incidentId) || null;
  } catch (error) {
    throw new Error(`Failed to get incident: ${error}`);
  }
}

/**
 * Update an existing incident.
 * Use when user asks to update, add notes, or change the status of an incident.
 * @param {string} incidentId
 * @param {Record<string, any>} updateData
 * @returns {Promise<Incident | null>}
 */
export async function update_incident(incidentId: string, updateData: Record<string, any>): Promise<Incident | null> {
  try {
    if (!updateData || typeof updateData !== "object" || Array.isArray(updateData)) {
      throw new Error("updateData must be a JSON object");
    }

    const incidents = await loadIncidents();
    const incidentIndex = incidents.findIndex(incident => incident.id === incidentId);
    
    if (incidentIndex === -1) {
      return null;
    }
    
    // Update the incident with new data
    incidents[incidentIndex] = {
      ...incidents[incidentIndex],
      ...updateData,
      // Preserve original id and timestamp
      id: incidents[incidentIndex].id,
      timestamp: incidents[incidentIndex].timestamp
    };
    
    await saveIncidents(incidents);
    return incidents[incidentIndex];
  } catch (error) {
    throw new Error(`Failed to update incident: ${error}`);
  }
}

/**
 * List all incidents (with optional filters).
 * Use when user asks to list, search, or filter incidents by date, status, or severity.
 * @param {Record<string, any>} [filters]
 * @returns {Promise<Incident[]>}
 */
export async function list_incidents(filters?: Record<string, any>): Promise<Incident[]> {
  try {
    const incidents = await loadIncidents();
    
    if (!filters || Object.keys(filters).length === 0) {
      return incidents;
    }
    
    // Apply basic filtering
    return incidents.filter(incident => {
      for (const [key, value] of Object.entries(filters)) {
        if (incident[key as keyof Incident] !== value) {
          return false;
        }
      }
      return true;
    });
  } catch (error) {
    throw new Error(`Failed to list incidents: ${error}`);
  }
} 