import fs from "fs";
import path from "path";

export interface ContextConfig {
  instructions: string;
  abbreviations: Record<string, string>;
  rules: string[];
  field_guidance: string;
  reference_material?: string;
}

export interface PromptRuntimeConfig {
  maxHistoryTokens: number;
  maxToolSteps: number;
  conversationalPatterns: string[];
  actionablePatterns: string[];
}

export const DEFAULT_CONTEXT_CONFIG: ContextConfig = {
  instructions:
    "You are the IB AI Assistant for Sev1 incident workflows. Prioritize clarity, ask for missing required fields before tool actions, and only call tools when they are necessary for the user's goal.",
  abbreviations: {
    RCA: "Root Cause Analysis",
    CAN: "Customer Alert Notice",
    TFE: "Terraform Enterprise",
    FDO: "Federated Deployment Option",
  },
  rules: [
    "Use available tools when external data or deterministic actions are required.",
    "Never fabricate required template fields; ask follow-up questions for missing data.",
    "Summarize tool results in clear operator language before suggesting next steps.",
    "Keep responses concise and operationally useful.",
  ],
  field_guidance:
    "If a template field is missing, ask for it explicitly. Only populate fields with user-provided or tool-provided information.",
  reference_material:
    "Detailed template examples and legacy guidance are stored separately and should not be injected into every model call.",
};

export const DEFAULT_PROMPT_RUNTIME_CONFIG: PromptRuntimeConfig = {
  maxHistoryTokens: 4000,
  maxToolSteps: 12,
  conversationalPatterns: [
    "^(hi|hello|hey|thanks|thank you|good morning|good night|bye)\\b",
    "^(what is|who is|why|how|can you explain|explain|define)\\b",
    "\\b(joke|fun fact|about yourself|your purpose)\\b",
  ],
  actionablePatterns: [
    "\\b(create|update|generate|search|find|list|load|open|fetch|run|call)\\b",
    "\\b(incident|rca|can|template|mcp|tool|status|sev1)\\b",
  ],
};

const CONTEXT_FILE_PATH = path.join(process.cwd(), "lib/context.json");
const PROMPT_RUNTIME_FILE_PATH = path.join(
  process.cwd(),
  "lib/prompt-runtime.json"
);

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeContextConfig(value: unknown): ContextConfig {
  if (!isObject(value)) {
    return DEFAULT_CONTEXT_CONFIG;
  }

  const instructions =
    typeof value.instructions === "string"
      ? value.instructions
      : DEFAULT_CONTEXT_CONFIG.instructions;
  const rules = Array.isArray(value.rules)
    ? value.rules.filter((rule): rule is string => typeof rule === "string")
    : DEFAULT_CONTEXT_CONFIG.rules;
  const abbreviations = isObject(value.abbreviations)
    ? Object.fromEntries(
        Object.entries(value.abbreviations)
          .filter((entry): entry is [string, string] => {
            return typeof entry[0] === "string" && typeof entry[1] === "string";
          })
          .map(([key, text]) => [key, text])
      )
    : DEFAULT_CONTEXT_CONFIG.abbreviations;
  const fieldGuidance =
    typeof value.field_guidance === "string"
      ? value.field_guidance
      : DEFAULT_CONTEXT_CONFIG.field_guidance;
  const referenceMaterial =
    typeof value.reference_material === "string"
      ? value.reference_material
      : DEFAULT_CONTEXT_CONFIG.reference_material;

  return {
    instructions,
    rules: rules.length ? rules : DEFAULT_CONTEXT_CONFIG.rules,
    abbreviations:
      Object.keys(abbreviations).length > 0
        ? abbreviations
        : DEFAULT_CONTEXT_CONFIG.abbreviations,
    field_guidance: fieldGuidance,
    reference_material: referenceMaterial,
  };
}

function normalizePromptRuntimeConfig(value: unknown): PromptRuntimeConfig {
  if (!isObject(value)) {
    return DEFAULT_PROMPT_RUNTIME_CONFIG;
  }

  const maxHistoryTokens =
    typeof value.maxHistoryTokens === "number" && value.maxHistoryTokens > 100
      ? value.maxHistoryTokens
      : DEFAULT_PROMPT_RUNTIME_CONFIG.maxHistoryTokens;
  const maxToolSteps =
    typeof value.maxToolSteps === "number" && value.maxToolSteps > 0
      ? Math.round(value.maxToolSteps)
      : DEFAULT_PROMPT_RUNTIME_CONFIG.maxToolSteps;
  const conversationalPatterns = Array.isArray(value.conversationalPatterns)
    ? value.conversationalPatterns.filter(
        (item): item is string => typeof item === "string" && item.length > 0
      )
    : DEFAULT_PROMPT_RUNTIME_CONFIG.conversationalPatterns;
  const actionablePatterns = Array.isArray(value.actionablePatterns)
    ? value.actionablePatterns.filter(
        (item): item is string => typeof item === "string" && item.length > 0
      )
    : DEFAULT_PROMPT_RUNTIME_CONFIG.actionablePatterns;

  return {
    maxHistoryTokens,
    maxToolSteps,
    conversationalPatterns:
      conversationalPatterns.length > 0
        ? conversationalPatterns
        : DEFAULT_PROMPT_RUNTIME_CONFIG.conversationalPatterns,
    actionablePatterns:
      actionablePatterns.length > 0
        ? actionablePatterns
        : DEFAULT_PROMPT_RUNTIME_CONFIG.actionablePatterns,
  };
}

export async function readContextConfig(): Promise<ContextConfig> {
  try {
    const raw = await fs.promises.readFile(CONTEXT_FILE_PATH, "utf-8");
    return normalizeContextConfig(JSON.parse(raw) as unknown);
  } catch {
    return DEFAULT_CONTEXT_CONFIG;
  }
}

export async function writeContextConfig(
  contextConfig: ContextConfig
): Promise<void> {
  const normalized = normalizeContextConfig(contextConfig);
  await fs.promises.writeFile(
    CONTEXT_FILE_PATH,
    `${JSON.stringify(normalized, null, 2)}\n`,
    "utf-8"
  );
}

export async function readPromptRuntimeConfig(): Promise<PromptRuntimeConfig> {
  try {
    const raw = await fs.promises.readFile(PROMPT_RUNTIME_FILE_PATH, "utf-8");
    return normalizePromptRuntimeConfig(JSON.parse(raw) as unknown);
  } catch {
    return DEFAULT_PROMPT_RUNTIME_CONFIG;
  }
}

export async function writePromptRuntimeConfig(
  promptRuntimeConfig: PromptRuntimeConfig
): Promise<void> {
  const normalized = normalizePromptRuntimeConfig(promptRuntimeConfig);
  await fs.promises.writeFile(
    PROMPT_RUNTIME_FILE_PATH,
    `${JSON.stringify(normalized, null, 2)}\n`,
    "utf-8"
  );
}

export function isPromptEditorEnabled(): boolean {
  return process.env.ALLOW_PROMPT_EDITOR === "true";
}
