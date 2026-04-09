export interface Message {
  id: string
  content: string
  sender: 'user' | 'ai'
  timestamp: Date
  isTyping?: boolean
  metadata?: {
    model?: string
    provider?: string
    elapsed_ms?: number
    total_duration?: number
    eval_count?: number
    eval_duration?: number
  }
}

export interface SavedConversation {
  id: string
  title: string
  messages: Message[]
  memory?: ConversationMemory
  createdAt: Date
  updatedAt: Date
  messageCount: number
}

export interface ConversationMemory {
  incidentSummary: string
  keyFacts: Record<string, string>
  updatedAt: string
}

export interface ConversationHistory {
  conversations: SavedConversation[]
  currentConversationId: string | null
}

export interface ConversationManager {
  saveConversation: (messages: Message[], title?: string) => string
  loadConversation: (id: string) => SavedConversation | null
  deleteConversation: (id: string) => void
  renameConversation: (id: string, newTitle: string) => void
  getAllConversations: () => SavedConversation[]
  generateTitle: (messages: Message[]) => string
  autoSave: (conversationId: string, messages: Message[]) => void
} 