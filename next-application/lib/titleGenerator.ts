import { Message } from '@/types/conversation'

export const titleGenerator = {
  // Generate title from first user message
  generateTitle(messages: Message[]): string {
    // Find the first user message
    const firstUserMessage = messages.find(msg => msg.sender === 'user')
    
    if (!firstUserMessage) {
      return 'New Conversation'
    }
    
    let content = firstUserMessage.content.trim()
    
    // Clean up the content for title generation
    content = this.cleanContent(content)
    
    // If too short, return as is
    if (content.length <= 50) {
      return content || 'New Conversation'
    }
    
    // Extract title based on content type
    const title = this.extractMeaningfulTitle(content)
    
    return title || 'New Conversation'
  },

  // Clean content for title generation
  cleanContent(content: string): string {
    // Remove markdown syntax
    content = content.replace(/[#*_`~\[\]]/g, '')
    
    // Remove extra whitespace
    content = content.replace(/\s+/g, ' ').trim()
    
    // Remove common conversation starters
    const conversationStarters = [
      'hi', 'hello', 'hey', 'good morning', 'good afternoon', 'good evening',
      'can you', 'could you', 'would you', 'please', 'i need', 'i want',
      'help me', 'assist me'
    ]
    
    const lowerContent = content.toLowerCase()
    for (const starter of conversationStarters) {
      if (lowerContent.startsWith(starter)) {
        content = content.substring(starter.length).trim()
        break
      }
    }
    
    return content
  },

  // Extract meaningful title from content
  extractMeaningfulTitle(content: string): string {
    // Try to identify the main topic/subject
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0)
    
    if (sentences.length === 0) {
      return content.substring(0, 50)
    }
    
    // Use the first sentence, but clean it up
    let title = sentences[0].trim()
    
    // If first sentence is too long, try to extract key words
    if (title.length > 60) {
      title = this.extractKeyWords(title)
    }
    
    // Capitalize first letter
    title = title.charAt(0).toUpperCase() + title.slice(1)
    
    // Ensure it's not too long
    if (title.length > 50) {
      title = title.substring(0, 47) + '...'
    }
    
    return title
  },

  // Extract key words from long content
  extractKeyWords(content: string): string {
    const words = content.split(/\s+/)
    const stopWords = new Set([
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
      'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did',
      'will', 'would', 'could', 'should', 'may', 'might', 'can', 'must', 'shall',
      'i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her', 'us', 'them',
      'this', 'that', 'these', 'those', 'my', 'your', 'his', 'her', 'its', 'our', 'their'
    ])
    
    // Filter out stop words and keep important words
    const keyWords = words.filter(word => {
      const clean = word.toLowerCase().replace(/[^a-z0-9]/g, '')
      return clean.length > 2 && !stopWords.has(clean)
    })
    
    // Take first 5-8 key words
    const selectedWords = keyWords.slice(0, Math.min(8, keyWords.length))
    
    return selectedWords.join(' ')
  },

  // Generate context-aware titles based on common patterns
  generateContextualTitle(content: string): string {
    const lowerContent = content.toLowerCase()
    
    // Programming/Technical questions
    if (lowerContent.includes('code') || lowerContent.includes('program') || lowerContent.includes('function')) {
      return 'Programming Help'
    }
    
    // How-to questions
    if (lowerContent.startsWith('how to') || lowerContent.startsWith('how do')) {
      return content.substring(0, 50)
    }
    
    // What is questions
    if (lowerContent.startsWith('what is') || lowerContent.startsWith('what are')) {
      return content.substring(0, 50)
    }
    
    // Error/Problem solving
    if (lowerContent.includes('error') || lowerContent.includes('problem') || lowerContent.includes('issue')) {
      return 'Problem Solving'
    }
    
    // API/Integration questions
    if (lowerContent.includes('api') || lowerContent.includes('integration') || lowerContent.includes('connect')) {
      return 'API Integration'
    }
    
    return content.substring(0, 50)
  }
} 