import fs from 'fs'
import path from 'path'

export interface UserProfile {
  role?: string;
  [key: string]: any;
}

export interface SessionContext {
  currentProject?: string;
  [key: string]: any;
}

export interface PromptContext {
  domain?: string;
  currentProject?: string;
  [key: string]: any;
}

export class PromptEngine {
  private static fileContext: any = null;
  private static loadPromise: Promise<void> | null = null;
  private static readonly TOKEN_BUDGET = 60000; // Leave room for response
  private static readonly TOKEN_ESTIMATE_RATIO = 4; // Rough estimate: 1 token ≈ 4 characters

  private contextHistory: Array<any> = [];
  private userProfile: UserProfile = {};
  private sessionContext: SessionContext = {};

  static async loadFileContext(filePath?: string): Promise<void> {
    if (this.fileContext !== null) return;
    
    if (this.loadPromise) {
      return this.loadPromise;
    }
    
    this.loadPromise = this._loadFile(filePath);
    return this.loadPromise;
  }
  
  private static async _loadFile(filePath?: string): Promise<void> {
    const defaultPath = path.join(process.cwd(), 'lib/context.json');
    const absPath = path.resolve(filePath || defaultPath);
    
    try {
      const content = await fs.promises.readFile(absPath, 'utf-8');
      this.fileContext = JSON.parse(content);
      console.log('[PromptEngine] Successfully loaded context from:', absPath);
    } catch (err) {
      console.warn('[PromptEngine] Using default context:', err);
      this.fileContext = {
        instructions: 'You are a Sev1 incident management assistant with access to MCP tools.',
        abbreviations: {},
        rules: []
      };
    }
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

  addToHistory(entry: any) {
    this.contextHistory.push(entry);
    if (this.contextHistory.length > 20) {
      this.contextHistory.shift(); // Keep last 20
    }
  }

  getRecentHistory(): string {
    return this.contextHistory
      .slice(-5)
      .map((h) => `User: ${h.user}\nAssistant: ${h.assistant}`)
      .join('\n');
  }

  buildPrompt(userInput: string, context: PromptContext = {}) {
    const systemPrompt = this.getSystemPrompt(context);
    const contextualPrompt = this.getContextualPrompt(userInput, context);
    const mcpInstructions = this.getMCPInstructions(context);
    
    // Build optimized prompt within token budget
    const optimizedPrompt = this.buildOptimizedPrompt(
      systemPrompt,
      contextualPrompt,
      mcpInstructions,
      userInput
    );
    
    const promptData = {
      system: systemPrompt,
      context: contextualPrompt,
      mcp: mcpInstructions,
      user: userInput,
      optimized: optimizedPrompt
    };
    
    console.log('[PromptEngine] Generated promptData:', promptData);
    return promptData;
  }

  /**
   * Builds an optimized prompt within the token budget
   */
  private buildOptimizedPrompt(
    systemPrompt: string,
    contextualPrompt: string,
    mcpInstructions: string,
    userInput: string
  ): string {
    const parts = [
      { content: systemPrompt, priority: 1, type: 'system' },
      { content: mcpInstructions, priority: 2, type: 'mcp' },
      { content: userInput, priority: 1, type: 'user' },
      { content: contextualPrompt, priority: 3, type: 'context' }
    ];

    // Sort by priority (lower number = higher priority)
    parts.sort((a, b) => a.priority - b.priority);

    let remainingTokens = PromptEngine.TOKEN_BUDGET;
    const includedParts: string[] = [];

    for (const part of parts) {
      const estimatedTokens = this.estimateTokens(part.content);
      if (estimatedTokens <= remainingTokens) {
        includedParts.push(part.content);
        remainingTokens -= estimatedTokens;
        console.log(`[PromptEngine] Included ${part.type} (${estimatedTokens} tokens), remaining: ${remainingTokens}`);
      } else {
        console.log(`[PromptEngine] Skipped ${part.type} (${estimatedTokens} tokens) - exceeds budget`);
      }
    }

    const finalPrompt = includedParts.join('\n\n');
    const actualTokens = this.estimateTokens(finalPrompt);
    
    console.log(`[PromptEngine] Final prompt: ${actualTokens} tokens (${Math.round(actualTokens / PromptEngine.TOKEN_BUDGET * 100)}% of budget)`);
    
    return finalPrompt;
  }

  /**
   * Estimates token count based on character length
   */
  private estimateTokens(text: string): number {
    return Math.ceil(text.length / PromptEngine.TOKEN_ESTIMATE_RATIO);
  }

  getSystemPrompt(context: PromptContext): string {
    let basePrompt = '';
    if (PromptEngine.fileContext?.instructions) {
      basePrompt += PromptEngine.fileContext.instructions + '\n';
    } else {
      basePrompt += `You are a Sev1 incident management assistant with access to MCP tools. `;
    }
    // Optionally append abbreviations/rules
    if (PromptEngine.fileContext?.abbreviations) {
      basePrompt += '\nAbbreviations:';
      for (const [abbr, full] of Object.entries(PromptEngine.fileContext.abbreviations)) {
        basePrompt += `\n- ${abbr}: ${full}`;
      }
    }
    if (PromptEngine.fileContext?.rules) {
      basePrompt += '\nSpecial Rules:';
      for (const rule of PromptEngine.fileContext.rules) {
        basePrompt += `\n- ${rule}`;
      }
    }
    if (PromptEngine.fileContext?.field_guidance) {
      basePrompt += '\n' + PromptEngine.fileContext.field_guidance;
    }
    // ...add domain-specific logic as before
    if (context.domain === 'technical') {
      basePrompt += `\nFocus on technical accuracy and provide code examples when relevant.`;
    } else if (context.domain === 'business') {
      basePrompt += `\nProvide business-focused insights with actionable recommendations.`;
    }
    return basePrompt;
  }

  getContextualPrompt(userInput: string, context: PromptContext): string {
    let prompt = `User context:\n`;
    if (this.contextHistory.length > 0) {
      prompt += `Previous conversation: ${this.getRecentHistory()}\n`;
    }
    if (this.userProfile.role) {
      prompt += `User role: ${this.userProfile.role}\n`;
    }
    if (context.currentProject) {
      prompt += `Current project: ${context.currentProject}\n`;
    }
    return prompt;
  }

  getMCPInstructions(context: PromptContext): string {
    const mcpPrompt = `MCP Server Instructions:\n`;
    const availableServers = this.getAvailableMCPServers(context);
    return (
      mcpPrompt +
      `Available tools: ${availableServers.join(', ')}\n` +
      `Use these tools when the user's request requires external data or actions.`
    );
  }

  getAvailableMCPServers(context: PromptContext): string[] {
    // This can be extended to use more sophisticated logic
    if (context.domain === 'technical') return ['database', 'filesystem', 'api'];
    if (context.domain === 'business') return ['database', 'api'];
    if (context.domain === 'data') return ['database', 'api'];
    if (context.domain === 'creative') return ['filesystem'];
    return [];
  }

  /**
   * Detects if the user input is conversational (chit-chat, meta, or general question)
   * Returns true if the input is conversational, false if actionable.
   */
  public static isConversationalQuery(userInput: string): boolean {
    if (!userInput || typeof userInput !== 'string') return false;
    const conversationalPatterns = [
      /^(how are you|who are you|what is your name|tell me a joke|hello|hi|hey|thanks|thank you|good morning|good night|bye|see you|help|can you help|explain|what is|who is|define|describe|give me an example|show me an example|what does|how do i|how to|what are|list|explain|why|when|where|which|who|how)\b/i,
      /\b(joke|fun fact|your name|your job|your purpose|your role|your creator|your company|your team)\b/i,
      /\b(about you|about yourself|about this app|about this system)\b/i
    ];
    return conversationalPatterns.some((re) => re.test(userInput.trim()));
  }
} 