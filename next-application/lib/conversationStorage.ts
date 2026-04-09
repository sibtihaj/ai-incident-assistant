import { SavedConversation, ConversationHistory } from '@/types/conversation'

export const conversationStorage = {
  // Get all conversations from localStorage
  // TEMPORARY: Disable chat history persistence for stateless chat
  getConversationHistory(): ConversationHistory {
    // Disabled: always return empty history
    return { conversations: [], currentConversationId: null }
  },

  // Save conversation history to localStorage
  saveConversationHistory(history: ConversationHistory): void {
    void history
    // Disabled: do nothing
  },

  // Save a single conversation
  saveConversation(conversation: SavedConversation): void {
    void conversation
    // Disabled: do nothing
  },

  // Load a specific conversation
  loadConversation(id: string): SavedConversation | null {
    void id
    // Disabled: always return null
    return null
  },

  // Delete a conversation
  deleteConversation(id: string): void {
    void id
    // Disabled: do nothing
  },

  // Rename a conversation
  renameConversation(id: string, newTitle: string): void {
    void id
    void newTitle
    // Disabled: do nothing
  },

  // Get all conversations sorted by most recent
  getAllConversations(): SavedConversation[] {
    // Disabled: always return empty array
    return []
  },

  // Set current conversation
  setCurrentConversation(id: string | null): void {
    void id
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