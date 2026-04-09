'use client'

import React, { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import MarkdownRenderer from './MarkdownRenderer'
import { motion } from 'framer-motion'
import { 
  Send, 
  Terminal, 
  Settings, 
  Plus, 
  Clock,
  Square,
  Activity,
  Cpu,
  Wrench
} from 'lucide-react'
import { Message, SavedConversation } from '@/types/conversation'
import { conversationManager } from '@/lib/conversationManager'

interface ChatInterfaceProps {
  className?: string
}

const availableTools = [
  {
    name: 'create_incident',
    description: 'Log a new Sev1 or critical incident.',
    prompt: `I need to log a new incident. Please call create_incident with this context:
Customer: 
Description: 
Severity: 
Status: investigating`
  },
  {
    name: 'get_incident',
    description: 'Retrieve details of a specific incident.',
    prompt: `Please fetch the details for incident ID: `
  },
  {
    name: 'list_incidents',
    description: 'List all currently tracked incidents.',
    prompt: `Please call list_incidents to show all currently tracked incidents.`
  },
  {
    name: 'update_incident',
    description: 'Update status or details of an existing incident.',
    prompt: `I need to update an incident. Please call update_incident.
Incident ID: 
New Status: `
  },
  {
    name: 'generate_can_document',
    description: 'Generate a Customer Alert Notice.',
    prompt: `Please call generate_can_document using the current incident context to create a Customer Alert Notice.`
  },
  {
    name: 'generate_rca_document',
    description: 'Generate a Root Cause Analysis report.',
    prompt: `Please call generate_rca_document using the current incident context to create a Root Cause Analysis report.`
  },
  {
    name: 'get_system_status',
    description: 'Check the health of a specific system.',
    prompt: `Please check the system status for: `
  },
  {
    name: 'calculate_downtime',
    description: 'Calculate SLA impact and downtime duration.',
    prompt: `Please calculate the downtime for incident ID: `
  }
];

export default function ChatInterface({ className }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [shouldStopGeneration, setShouldStopGeneration] = useState(false)
  const [currentTypingMessageId, setCurrentTypingMessageId] = useState<string | null>(null)
  const [conversationHistory, setConversationHistory] = useState<SavedConversation[]>([])
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null)
  const [thinkingStartTime, setThinkingStartTime] = useState<number | null>(null)
  const [serverStatus, setServerStatus] = useState<{
    llm: 'healthy' | 'error' | 'loading'
    mcp: 'healthy' | 'error' | 'loading'
    llmError?: string
    mcpError?: string
  }>({
    llm: 'loading',
    mcp: 'loading'
  })
  const [context, setContext] = useState<any>({})
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const [thinkingMessage, setThinkingMessage] = useState<string>("Processing request...")

  // Add initial message ONLY when we know the LLM status is healthy
  useEffect(() => {
    if (serverStatus.llm === 'healthy' && messages.length === 0) {
      setMessages([
        {
          id: '1',
          content: 'Workspace initialized. LangChain orchestrator connected. Vercel AI Gateway nominal.\n\nReady to triage incidents or execute MCP tool workflows. How should we proceed?',
          sender: 'ai',
          timestamp: new Date(),
          metadata: {
            model: 'openai/gpt-5.4' // Or dynamic from status if available
          }
        }
      ]);
    } else if (serverStatus.llm === 'error' && messages.length === 0) {
      setMessages([
        {
          id: '1',
          content: 'System Error: Cannot connect to Vercel AI Gateway. Please check your credentials and network connection.',
          sender: 'ai',
          timestamp: new Date(),
        }
      ]);
    }
  }, [serverStatus.llm, messages.length])

  useEffect(() => {
    if (!thinkingStartTime) {
      setThinkingMessage("Processing request...")
      return
    }

    const interval = setInterval(() => {
      const elapsedSeconds = (Date.now() - thinkingStartTime) / 1000
      if (elapsedSeconds > 10) setThinkingMessage("Executing tool call sequence...")
      else if (elapsedSeconds > 5) setThinkingMessage("Analyzing context parameters...")
    }, 2000)

    return () => clearInterval(interval)
  }, [thinkingStartTime])

  const stopGeneration = () => {
    setShouldStopGeneration(true)
  }

  useEffect(() => {
    const checkServerStatus = async () => {
      try {
        const response = await fetch('/api/chat')
        if (response.ok) {
          const data = await response.json()
          setServerStatus({
            llm: data.llm_status || 'error',
            mcp: data.mcp_status || 'error',
            llmError: data.llm_error,
            mcpError: data.mcp_error
          })
        } else {
          setServerStatus(prev => ({ ...prev, llm: 'error', mcp: 'error' }))
        }
      } catch (error) {
        setServerStatus(prev => ({ ...prev, llm: 'error', mcp: 'error' }))
      }
    }

    checkServerStatus()
    const interval = setInterval(checkServerStatus, 30000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return

    const userMessage: Message = {
      id: Date.now().toString(),
      content: inputValue,
      sender: 'user',
      timestamp: new Date()
    }

    const messageToSend = inputValue
    const newMessages = [...messages, userMessage]
    setMessages(newMessages)
    setInputValue('')
    setIsLoading(true)
    setThinkingStartTime(Date.now())
    setError(null)

    if (!currentConversationId) {
      const newConversationId = conversationManager.startNewConversation()
      setCurrentConversationId(newConversationId)
    }

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: messageToSend,
          conversationHistory: newMessages.slice(-20),
          userContext: context
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to get AI response')
      }

      const data = await response.json()
      if (data.context) {
        setContext(data.context)
      }
      
      const aiMessageId = (Date.now() + 1).toString()
      const aiResponse: Message = {
        id: aiMessageId,
        content: data.content,
        sender: 'ai',
        timestamp: new Date(),
        isTyping: true,
        metadata: {
          model: data.model,
          provider: data.metadata?.provider,
          elapsed_ms: data.metadata?.elapsedMs
        }
      }

      setMessages(prev => [...prev, aiResponse])
      setIsLoading(false)
      setThinkingStartTime(null)
      setCurrentTypingMessageId(aiMessageId)
      setShouldStopGeneration(false)

    } catch (error) {
      console.error('Error sending message:', error)
      setError(error instanceof Error ? error.message : 'System fault')
      setIsLoading(false)
      setThinkingStartTime(null)
      
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: 'System Error: Failed to execute operational loop. Verify Gateway credentials and MCP transport.',
        sender: 'ai',
        timestamp: new Date()
      }
      setMessages(prev => [...prev, errorMessage])
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const handleNewConversation = () => {
    const newConversationId = conversationManager.startNewConversation()
    setCurrentConversationId(newConversationId)
    setMessages([
      {
        id: Date.now().toString(),
        content: 'Workspace initialized. LangChain orchestrator connected. Vercel AI Gateway nominal.\n\nReady to triage incidents or execute MCP tool workflows. How should we proceed?',
        sender: 'ai',
        timestamp: new Date(),
        metadata: {
          model: 'openai/gpt-5.4'
        }
      }
    ])
    setInputValue('')
    setIsLoading(false)
    setThinkingStartTime(null)
    setError(null)
    setShouldStopGeneration(false)
    setCurrentTypingMessageId(null)
  }

  const insertToolPrompt = (prompt: string) => {
    setInputValue(prev => prev.trim() ? prev + '\n\n' + prompt : prompt)
  }

  return (
    <div className={`flex h-[calc(100vh-56px)] w-full bg-white overflow-hidden ${className}`}>
      
      {/* Sidebar - Tool Registry */}
      <div className="w-80 h-full border-r border-slate-200 bg-slate-50 flex flex-col flex-shrink-0">
        <div className="p-6 border-b border-slate-200">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-sm font-outfit font-bold text-slate-900 uppercase tracking-widest">Workspace</h2>
            <Button variant="ghost" size="icon" className="h-6 w-6 text-slate-400 hover:text-slate-900 rounded-sm">
              <Settings className="h-4 w-4" />
            </Button>
          </div>
          
          <Button 
            onClick={handleNewConversation}
            className="w-full bg-slate-950 hover:bg-slate-800 text-white rounded-sm font-medium text-xs tracking-widest uppercase h-10" 
          >
            <Plus className="h-4 w-4 mr-2" />
            New Session
          </Button>

          {/* System Status */}
          <div className="mt-8 space-y-4">
            <h3 className="text-[10px] font-mono text-slate-400 uppercase tracking-widest">Telemetry</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-slate-500">Gateway</span>
                <span className={serverStatus.llm === 'healthy' ? 'text-emerald-600' : 'text-red-600'}>
                  {serverStatus.llm === 'healthy' ? 'ONLINE' : 'ERR'}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-slate-500">MCP Transport</span>
                <span className={serverStatus.mcp === 'healthy' ? 'text-emerald-600' : 'text-red-600'}>
                  {serverStatus.mcp === 'healthy' ? 'ONLINE' : 'ERR'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Available Tools */}
        <div className="flex-1 overflow-y-auto p-6 scrollbar-none">
          <h3 className="text-[10px] font-mono text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
            <Wrench className="h-3 w-3" />
            Registered Tools
          </h3>
          <div className="space-y-2">
            {availableTools.map((tool) => (
              <button
                key={tool.name}
                onClick={() => insertToolPrompt(tool.prompt)}
                className="w-full text-left group p-3 border border-slate-200 bg-white hover:border-slate-400 transition-colors rounded-sm"
              >
                <div className="font-mono text-xs font-bold text-slate-900 mb-1 flex items-center justify-between">
                  {tool.name}
                  <span className="opacity-0 group-hover:opacity-100 text-slate-400 transition-opacity">→</span>
                </div>
                <div className="text-[10px] font-outfit text-slate-500 leading-relaxed">
                  {tool.description}
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col h-full relative bg-white">
        
        {/* Header */}
        <div className="h-14 border-b border-slate-200 flex items-center justify-between px-8 bg-white flex-shrink-0">
          <div className="flex items-center gap-3">
            <Terminal className="h-4 w-4 text-slate-900" />
            <span className="text-sm font-outfit font-medium text-slate-900">Incident Terminal</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest">
              Engine: LangChain
            </span>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-8 py-8 scrollbar-none">
          <div className="max-w-3xl mx-auto space-y-12">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex flex-col ${message.sender === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400">
                    {message.sender === 'user' ? 'Operator' : 'System'}
                  </span>
                  <span className="text-slate-300">/</span>
                  <span className="text-[10px] font-mono text-slate-400">
                    {message.timestamp.toLocaleTimeString()}
                  </span>
                </div>
                
                <div className={`w-full ${message.sender === 'user' ? 'max-w-xl' : 'max-w-full'}`}>
                  {message.sender === 'user' ? (
                    <div className="bg-slate-50 border border-slate-200 p-4 rounded-sm text-sm text-slate-900 font-outfit leading-relaxed">
                      {message.content}
                    </div>
                  ) : (
                    <div className="prose prose-sm prose-slate max-w-none">
                      <MarkdownRenderer 
                        content={message.content} 
                        className="text-sm text-slate-800 leading-relaxed font-outfit"
                        inheritTextColor={false}
                      />
                    </div>
                  )}
                </div>

                {message.metadata?.model && message.sender === 'ai' && (
                  <div className="mt-3 flex items-center gap-2 text-[10px] font-mono text-slate-400 uppercase">
                    <Cpu className="h-3 w-3" />
                    {message.metadata.model}
                    {message.metadata.elapsed_ms && (
                      <>
                        <span className="text-slate-300">|</span>
                        <span>{message.metadata.elapsed_ms}ms</span>
                      </>
                    )}
                  </div>
                )}
              </div>
            ))}
            
            {isLoading && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-start"
              >
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400">System</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-slate-500 font-mono">
                  <Activity className="h-4 w-4 animate-pulse text-blue-500" />
                  {thinkingMessage}
                </div>
              </motion.div>
            )}
            <div ref={messagesEndRef} className="h-4" />
          </div>
        </div>

        {/* Input Area */}
        <div className="p-8 border-t border-slate-200 bg-white flex-shrink-0">
          <div className="max-w-3xl mx-auto relative">
            <Textarea
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Enter command or natural language instruction..."
              className="min-h-[100px] w-full resize-none border-slate-200 bg-slate-50 rounded-sm p-4 text-sm font-outfit focus:border-slate-900 focus:ring-0 transition-colors pb-14"
              disabled={isLoading}
            />
            
            <div className="absolute bottom-4 right-4 flex items-center gap-2">
              {currentTypingMessageId && (
                <Button
                  onClick={stopGeneration}
                  variant="outline"
                  size="sm"
                  className="h-8 border-slate-200 text-slate-500 hover:text-slate-900 rounded-sm text-xs font-mono uppercase"
                >
                  <Square className="h-3 w-3 mr-2" />
                  Halt
                </Button>
              )}
              <Button
                onClick={handleSendMessage}
                disabled={!inputValue.trim() || isLoading}
                className="h-8 bg-slate-950 hover:bg-slate-800 text-white rounded-sm text-xs font-mono uppercase px-4"
              >
                Execute
                <Send className="h-3 w-3 ml-2" />
              </Button>
            </div>
            
            {error && (
              <div className="absolute -top-10 left-0 text-xs font-mono text-red-500 bg-red-50 px-3 py-1 border border-red-200 rounded-sm">
                ERR: {error}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
