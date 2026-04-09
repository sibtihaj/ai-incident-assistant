export interface Message {
  id: string
  content: string
  sender: 'user' | 'ai'
  timestamp: Date
  metadata?: {
    model?: string
    tokens?: number
    processingTime?: number
  }
}

export interface ChatSession {
  id: string
  title: string
  messages: Message[]
  createdAt: Date
  updatedAt: Date
}

export interface MCPServer {
  id: string
  name: string
  url: string
  status: 'connected' | 'disconnected' | 'error'
  capabilities: string[]
}

export interface MCPClient {
  id: string
  serverId: string
  connectionStatus: 'active' | 'inactive'
  lastPing?: Date
}

export interface ChatSettings {
  model: string
  temperature: number
  maxTokens: number
  systemPrompt?: string
}

export interface ChatInterfaceProps {
  className?: string
  initialMessages?: Message[]
  onMessageSend?: (message: Message) => void
  onMessageReceive?: (message: Message) => void
} 