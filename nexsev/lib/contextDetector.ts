export type Intent = 'technical' | 'business' | 'creative' | 'data' | 'general';

export interface Entities {
  technologies: string[];
  projects: string[];
  timeframes: string[];
  actions: string[];
}

export class ContextDetector {
  static detectIntent(userInput: string): Intent {
    const intents: Record<Intent, RegExp> = {
      technical: /code|debug|error|api|database|function|deploy|incident|log|stack|infra|terraform|vault|consul/i,
      business: /revenue|profit|strategy|market|sales|customer|impact|sla|escalate/i,
      creative: /write|create|design|story|content|draft|compose/i,
      data: /analyze|chart|graph|statistics|report|metric|trend/i,
      general: /.*/
    };
    for (const [intent, pattern] of Object.entries(intents)) {
      if (pattern.test(userInput)) {
        return intent as Intent;
      }
    }
    return 'general';
  }

  static extractEntities(userInput: string): Entities {
    const entities: Entities = {
      technologies: [],
      projects: [],
      timeframes: [],
      actions: []
    };
    // Simple technology extraction
    const techPattern = /(react|nextjs|node|python|javascript|typescript|terraform|vault|consul|docker|kubernetes)/gi;
    entities.technologies = userInput.match(techPattern) || [];
    // Project extraction (example: look for capitalized words)
    const projectPattern = /\b([A-Z][a-zA-Z0-9]+)\b/g;
    entities.projects = (userInput.match(projectPattern) || []).filter(word => word.length > 2);
    // Timeframe extraction (simple)
    const timePattern = /(today|yesterday|last week|this week|this month|\d{1,2} (minutes?|hours?|days?) ago)/gi;
    entities.timeframes = userInput.match(timePattern) || [];
    // Action extraction (simple verbs)
    const actionPattern = /(deploy|fix|investigate|analyze|restart|upgrade|rollback|check|review|update|create|delete)/gi;
    entities.actions = userInput.match(actionPattern) || [];
    return entities;
  }
} 