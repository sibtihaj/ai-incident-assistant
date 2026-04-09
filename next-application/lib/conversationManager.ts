import { Message, SavedConversation } from '@/types/conversation'
import { titleGenerator } from './titleGenerator'

export class ConversationManager {
  private currentConversationId: string | null = null
  private autoSaveTimeout: NodeJS.Timeout | null = null

  constructor() {
    // Disabled: do not load current conversation ID from storage
    this.currentConversationId = null
  }

  // Save a new conversation or update existing one
  saveConversation(messages: Message[], title?: string): string {
    if (messages.length === 0) {
      throw new Error('Cannot save empty conversation')
    }

    const now = new Date()
    const conversationId = this.currentConversationId || this.generateConversationId()
    
    const _conversation: SavedConversation = {
      id: conversationId,
      title: title || titleGenerator.generateTitle(messages),
      messages: messages,
      createdAt: this.currentConversationId ? now : now,
      updatedAt: now,
      messageCount: messages.length
    }

    // Disabled: do not persist conversation
    void _conversation
    
    // Update current conversation ID
    this.currentConversationId = conversationId
    // conversationStorage.setCurrentConversation(conversationId)

    return conversationId
  }

  // Load a conversation by ID
  loadConversation(id: string): SavedConversation | null {
    void id
    // Disabled: do not load from storage
    return null
  }

  // Delete a conversation
  deleteConversation(id: string): void {
    // conversationStorage.deleteConversation(id)
    
    // If deleting current conversation, clear current ID
    if (id === this.currentConversationId) {
      this.currentConversationId = null
      // conversationStorage.setCurrentConversation(null)
    }
  }

  // Rename a conversation
  renameConversation(id: string, newTitle: string): void {
    void id
    void newTitle
    // conversationStorage.renameConversation(id, newTitle)
  }

  // Get all conversations sorted by most recent
  getAllConversations(): SavedConversation[] {
    // Disabled: do not load from storage
    return []
  }

  // Auto-save current conversation (debounced)
  autoSave(conversationId: string, messages: Message[]): void {
    if (messages.length === 0) return

    // Clear existing timeout
    if (this.autoSaveTimeout) {
      clearTimeout(this.autoSaveTimeout)
    }

    // Disabled: do not auto-save
    // Set new timeout for auto-save
    // this.autoSaveTimeout = setTimeout(() => {
    //   try {
    //     const existingConversation = conversationStorage.loadConversation(conversationId)
    //     const title = existingConversation?.title || titleGenerator.generateTitle(messages)
        
    //     const conversation: SavedConversation = {
    //       id: conversationId,
    //       title: title,
    //       messages: messages,
    //       createdAt: existingConversation?.createdAt || new Date(),
    //       updatedAt: new Date(),
    //       messageCount: messages.length
    //     }

    //     conversationStorage.saveConversation(conversation)
    //   } catch (error) {
    //     console.error('Auto-save failed:', error)
    //   }
    // }, 2000) // 2 second delay
  }

  // Start a new conversation
  startNewConversation(): string {
    const newId = this.generateConversationId()
    this.currentConversationId = newId
    // conversationStorage.setCurrentConversation(newId)
    return newId
  }

  // Get current conversation ID
  getCurrentConversationId(): string | null {
    return this.currentConversationId
  }

  // Generate a unique conversation ID
  private generateConversationId(): string {
    return `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  // Clear all conversations
  clearAllConversations(): void {
    // conversationStorage.clearAllConversations()
    this.currentConversationId = null
  }

  // Get conversation statistics
  getConversationStats(id: string): {
    messageCount: number
    lastUpdated: Date
    duration: string
  } | null {
    // conversationStorage.loadConversation(id)
    if (!id) return null

    const now = new Date()
    const diffMs = now.getTime() - new Date().getTime() // Assuming updatedAt is new Date() for stats
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffMinutes = Math.floor(diffMs / (1000 * 60))

    let duration: string
    if (diffDays > 0) {
      duration = `${diffDays} day${diffDays > 1 ? 's' : ''} ago`
    } else if (diffHours > 0) {
      duration = `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`
    } else if (diffMinutes > 0) {
      duration = `${diffMinutes} minute${diffMinutes > 1 ? 's' : ''} ago`
    } else {
      duration = 'Just now'
    }

    return {
      messageCount: 0, // No message count stored in this manager
      lastUpdated: new Date(), // Assuming updatedAt is new Date() for stats
      duration
    }
  }
}

// Export singleton instance
export const conversationManager = new ConversationManager() 