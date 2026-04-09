import { SavedConversation, ConversationHistory, Message } from '@/types/conversation'

const STORAGE_KEY = 'nexsev-conversations'

export const conversationStorage = {
  // Get all conversations from localStorage
  // TEMPORARY: Disable chat history persistence for stateless chat
  getConversationHistory(): ConversationHistory {
    // Disabled: always return empty history
    return { conversations: [], currentConversationId: null }
  },

  // Save conversation history to localStorage
  saveConversationHistory(history: ConversationHistory): void {
    // Disabled: do nothing
  },

  // Save a single conversation
  saveConversation(conversation: SavedConversation): void {
    // Disabled: do nothing
  },

  // Load a specific conversation
  loadConversation(id: string): SavedConversation | null {
    // Disabled: always return null
    return null
  },

  // Delete a conversation
  deleteConversation(id: string): void {
    // Disabled: do nothing
  },

  // Rename a conversation
  renameConversation(id: string, newTitle: string): void {
    // Disabled: do nothing
  },

  // Get all conversations sorted by most recent
  getAllConversations(): SavedConversation[] {
    // Disabled: always return empty array
    return []
  },

  // Set current conversation
  setCurrentConversation(id: string | null): void {
    // Disabled: do nothing
  },

  // Get current conversation ID
  getCurrentConversationId(): string | null {
    // Disabled: always return null
    return null
  },

  // Clear all conversations
  clearAllConversations(): void {
    // Disabled: do nothing
  }
} 