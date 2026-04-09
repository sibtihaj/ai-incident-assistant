import {
  type ContextConfig,
  DEFAULT_CONTEXT_CONFIG,
  DEFAULT_PROMPT_RUNTIME_CONFIG,
  type PromptRuntimeConfig,
  readContextConfig,
  readPromptRuntimeConfig,
} from "@/lib/promptConfigStore";
import type { Entities } from "@/lib/contextDetector";

export interface UserProfile {
  role?: string;
  [key: string]: unknown;
}

export interface SessionContext {
  currentProject?: string;
  [key: string]: unknown;
}

export interface PromptContext {
  domain?: string;
  intent?: string;
  entities?: Entities;
  currentProject?: string;
  [key: string]: unknown;
}

export class PromptEngine {
  private static fileContext: ContextConfig | null = null;
  private static runtimeConfig: PromptRuntimeConfig | null = null;
  private static loadPromise: Promise<void> | null = null;

  private userProfile: UserProfile = {};
  private sessionContext: SessionContext = {};

  static async loadFileContext(): Promise<void> {
    if (this.fileContext !== null && this.runtimeConfig !== null) return;
    
    if (this.loadPromise) {
      return this.loadPromise;
    }
    
    this.loadPromise = this._loadFile();
    return this.loadPromise;
  }
  
  private static async _loadFile(): Promise<void> {
    this.fileContext = await readContextConfig();
    this.runtimeConfig = await readPromptRuntimeConfig();
  }

  constructor() {
    // Initialize context loading
    PromptEngine.loadFileContext().catch(err => {
      console.error('[PromptEngine] Failed to load context:', err);
    });
  }

  setUserProfile(profile: UserProfile) {
    this.userProfile = profile;
  }

  setSessionContext(context: SessionContext) {
    this.sessionContext = context;
  }

  buildPrompt(context: PromptContext = {}) {
    const systemPrompt = this.getSystemPrompt(context);
    const contextualPrompt = this.getContextualPrompt(context);
    
    const promptData = {
      system: systemPrompt,
      context: contextualPrompt,
      optimized: [systemPrompt, contextualPrompt].filter(Boolean).join("\n\n"),
    };
    
    console.log('[PromptEngine] Generated promptData:', promptData);
    return promptData;
  }

  getSystemPrompt(context: PromptContext): string {
    const config = PromptEngine.fileContext ?? DEFAULT_CONTEXT_CONFIG;
    let basePrompt = "";
    if (PromptEngine.fileContext?.instructions) {
      basePrompt += `${config.instructions}\n`;
    } else {
      basePrompt += `You are a Sev1 incident management assistant with access to MCP tools. `;
    }

    if (Object.keys(config.abbreviations).length > 0) {
      basePrompt += "\nAbbreviations:";
      for (const [abbr, full] of Object.entries(config.abbreviations)) {
        basePrompt += `\n- ${abbr}: ${full}`;
      }
    }

    if (config.rules.length > 0) {
      basePrompt += "\nSpecial Rules:";
      for (const rule of config.rules) {
        basePrompt += `\n- ${rule}`;
      }
    }

    if (config.field_guidance) {
      basePrompt += `\n${config.field_guidance}`;
    }

    if (context.domain === "technical") {
      basePrompt += `\nFocus on technical accuracy and provide code examples when relevant.`;
    } else if (context.domain === "business") {
      basePrompt += `\nProvide business-focused insights with actionable recommendations.`;
    }

    basePrompt +=
      "\nUse MCP tools only when needed for external data, state changes, or deterministic document workflows.";
    return basePrompt;
  }

  getContextualPrompt(context: PromptContext): string {
    const lines: string[] = ["Runtime context:"];
    if (this.userProfile.role) {
      lines.push(`- User role: ${this.userProfile.role}`);
    }
    const project = context.currentProject ?? this.sessionContext.currentProject;
    if (project) {
      lines.push(`- Current project: ${project}`);
    }
    if (context.intent) {
      lines.push(`- Intent signal: ${context.intent}`);
    }
    if (context.entities && Object.keys(context.entities).length > 0) {
      lines.push(`- Extracted entities available for grounding.`);
    }
    return lines.join("\n");
  }

  /**
   * Detects if the user input is conversational (chit-chat, meta, or general question)
   * Returns true if the input is conversational, false if actionable.
   */
  public static isConversationalQuery(
    userInput: string,
    runtimeConfig?: PromptRuntimeConfig
  ): boolean {
    if (!userInput || typeof userInput !== 'string') return false;
    const source = runtimeConfig ?? this.runtimeConfig ?? DEFAULT_PROMPT_RUNTIME_CONFIG;
    const trimmed = userInput.trim();
    const actionablePatternMatch = source.actionablePatterns.some((pattern) =>
      new RegExp(pattern, "i").test(trimmed)
    );
    if (actionablePatternMatch) {
      return false;
    }
    return source.conversationalPatterns.some((pattern) =>
      new RegExp(pattern, "i").test(trimmed)
    );
  }

  public static getRuntimeConfig(): PromptRuntimeConfig {
    return this.runtimeConfig ?? DEFAULT_PROMPT_RUNTIME_CONFIG;
  }
}