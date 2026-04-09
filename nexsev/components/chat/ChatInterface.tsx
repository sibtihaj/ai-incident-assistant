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
  Square,
  Activity,
  Cpu,
  Wrench,
  Loader2
} from 'lucide-react'
import { Message } from '@/types/conversation'
import { conversationManager } from '@/lib/conversationManager'
import { DEFAULT_GATEWAY_MODEL_ID } from '@/lib/ai/constants'

interface ChatInterfaceProps {
  className?: string
}

/** Fixed options so SSR (Node) and the browser produce the same string — avoids hydration mismatches. */
function formatMessageTime(d: Date): string {
  return d.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })
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
  const [currentTypingMessageId, setCurrentTypingMessageId] = useState<string | null>(null)
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)
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
  const [context, setContext] = useState<Record<string, unknown>>({})
  /** Resolved from GET /api/chat `current_model` for welcome message metadata */
  const [gatewayModelLabel, setGatewayModelLabel] = useState<string | undefined>()
  /** Set after mount so server and first client paint match (no Date in SSR HTML). */
  const [playgroundInitClock, setPlaygroundInitClock] = useState('—')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const isPlaygroundInitializing =
    serverStatus.llm === 'loading' || serverStatus.mcp === 'loading'

  useEffect(() => {
    setPlaygroundInitClock(formatMessageTime(new Date()))
  }, [])

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
          content: 'Playground initialized. LangChain orchestrator connected. Vercel AI Gateway nominal.\n\nReady to triage incidents or execute MCP tool workflows. How should we proceed?',
          sender: 'ai',
          timestamp: new Date(),
          metadata: {
            model: gatewayModelLabel ?? DEFAULT_GATEWAY_MODEL_ID
          }
        }
      ]);
    } else if (serverStatus.llm === 'error' && messages.length === 0) {
      const detail = serverStatus.llmError?.trim()
      const safeDetail =
        detail && detail.length > 600 ? `${detail.slice(0, 600)}…` : detail
      const content = safeDetail
        ? `System Error: cannot reach Vercel AI Gateway.\n\nDetails: ${safeDetail}`
        : 'System Error: Cannot connect to Vercel AI Gateway. Please check your credentials and network connection.'
      setMessages([
        {
          id: '1',
          content,
          sender: 'ai',
          timestamp: new Date(),
        }
      ]);
    }
  }, [serverStatus.llm, serverStatus.llmError, messages.length, gatewayModelLabel])

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
    abortControllerRef.current?.abort()
  }

  useEffect(() => {
    const checkServerStatus = async () => {
      try {
        const response = await fetch('/api/chat')
        if (response.ok) {
          const data = (await response.json()) as {
            llm_status?: string
            mcp_status?: string
            llm_error?: string
            mcp_error?: string
            error?: string
            current_model?: string
          }
          setServerStatus({
            llm: data.llm_status === 'healthy' ? 'healthy' : 'error',
            mcp: data.mcp_status === 'healthy' ? 'healthy' : 'error',
            llmError: data.llm_error ?? data.error,
            mcpError: data.mcp_error
          })
          if (data.current_model?.trim()) {
            setGatewayModelLabel(data.current_model.trim())
          }
        } else {
          setServerStatus(prev => ({ ...prev, llm: 'error', mcp: 'error' }))
        }
      } catch {
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
    if (!inputValue.trim() || isLoading || isPlaygroundInitializing) return

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

    const controller = new AbortController()
    abortControllerRef.current = controller

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
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
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        setIsLoading(false)
        setThinkingStartTime(null)
        return
      }
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
    } finally {
      abortControllerRef.current = null
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
        content: 'Playground initialized. LangChain orchestrator connected. Vercel AI Gateway nominal.\n\nReady to triage incidents or execute MCP tool workflows. How should we proceed?',
        sender: 'ai',
        timestamp: new Date(),
        metadata: {
          model: gatewayModelLabel ?? DEFAULT_GATEWAY_MODEL_ID
        }
      }
    ])
    setInputValue('')
    setIsLoading(false)
    setThinkingStartTime(null)
    setError(null)
    setCurrentTypingMessageId(null)
  }

  const insertToolPrompt = (prompt: string) => {
    setInputValue(prev => prev.trim() ? prev + '\n\n' + prompt : prompt)
  }

  return (
    <div className={`flex h-full min-h-0 w-full flex-1 overflow-hidden bg-white ${className}`}>
      
      {/* Sidebar - Tool Registry */}
      <div className="w-80 h-full border-r border-slate-200 bg-slate-50 flex flex-col flex-shrink-0">
        <div className="p-6 border-b border-slate-200">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-sm font-outfit font-bold text-slate-900 uppercase tracking-widest">Playground</h2>
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
                <span
                  className={`inline-flex items-center gap-1.5 uppercase tracking-wide ${
                    serverStatus.llm === 'loading'
                      ? 'text-amber-600'
                      : serverStatus.llm === 'healthy'
                        ? 'text-emerald-600'
                        : 'text-red-600'
                  }`}
                >
                  {serverStatus.llm === 'loading' && (
                    <Loader2 className="h-3 w-3 shrink-0 animate-spin" aria-hidden />
                  )}
                  {serverStatus.llm === 'loading'
                    ? 'LOADING'
                    : serverStatus.llm === 'healthy'
                      ? 'ONLINE'
                      : 'ERR'}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-slate-500">MCP Transport</span>
                <span
                  className={`inline-flex items-center gap-1.5 uppercase tracking-wide ${
                    serverStatus.mcp === 'loading'
                      ? 'text-amber-600'
                      : serverStatus.mcp === 'healthy'
                        ? 'text-emerald-600'
                        : 'text-red-600'
                  }`}
                >
                  {serverStatus.mcp === 'loading' && (
                    <Loader2 className="h-3 w-3 shrink-0 animate-spin" aria-hidden />
                  )}
                  {serverStatus.mcp === 'loading'
                    ? 'LOADING'
                    : serverStatus.mcp === 'healthy'
                      ? 'ONLINE'
                      : 'ERR'}
                </span>
              </div>
              <div className="rounded-sm border border-slate-200 bg-white p-3 shadow-sm">
                <div className="mb-1.5 text-[10px] font-mono uppercase tracking-widest text-slate-400">
                  Gateway model
                </div>
                <p className="break-all font-mono text-xs font-semibold leading-snug text-slate-950">
                  {gatewayModelLabel ?? DEFAULT_GATEWAY_MODEL_ID}
                </p>
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

      {/* Main Chat Area — min-h-0 so messages scroll and input stays at bottom */}
      <div className="relative flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-white">
        {/* Header */}
        <div className="flex h-14 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-8">
          <div className="flex items-center gap-3">
            <Terminal className="h-4 w-4 text-slate-900" />
            <span className="text-sm font-outfit font-medium text-slate-900">Incident Terminal</span>
          </div>
          <div className="flex min-w-0 flex-1 items-center justify-end gap-3 sm:gap-4">
            <div
              className="flex min-w-0 max-w-[70vw] items-center gap-2"
              title="Active Vercel AI Gateway model"
            >
              <Cpu className="h-3.5 w-3.5 shrink-0 text-emerald-500" aria-hidden />
              <span className="truncate font-mono text-xs font-medium tracking-widest text-slate-700 uppercase">
                {gatewayModelLabel ?? DEFAULT_GATEWAY_MODEL_ID}
              </span>
            </div>
            <span className="hidden shrink-0 text-[10px] font-mono uppercase tracking-widest text-slate-400 xl:inline">
              Engine: LangChain
            </span>
          </div>
        </div>

        {/* Messages */}
        <div className="min-h-0 flex-1 overflow-y-auto px-8 py-8 scrollbar-none">
          <div className="max-w-3xl mx-auto space-y-12">
            {isPlaygroundInitializing && messages.length === 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-start"
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400">
                    System
                  </span>
                  <span className="text-slate-300">/</span>
                  <span className="text-[10px] font-mono text-slate-400">
                    {playgroundInitClock}
                  </span>
                </div>
                <div className="w-full border border-slate-200 bg-slate-50/80 rounded-sm p-6">
                  <div className="flex items-start gap-4">
                    <Loader2
                      className="h-5 w-5 shrink-0 text-slate-700 animate-spin mt-0.5"
                      aria-hidden
                    />
                    <div className="space-y-2">
                      <p className="text-sm font-outfit font-medium text-slate-900">
                        Initializing playground…
                      </p>
                      <p className="text-xs font-outfit text-slate-600 leading-relaxed">
                        Verifying Vercel AI Gateway and MCP transport. Stand by.
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
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
                    {formatMessageTime(message.timestamp)}
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

        {/* Input Area — pinned to bottom of chat column (viewport below navbar) */}
        <div className="shrink-0 border-t border-slate-200 bg-white p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] shadow-[0_-8px_30px_-12px_rgba(15,23,42,0.12)] sm:p-8 sm:pb-[max(2rem,env(safe-area-inset-bottom))]">
          <div className="max-w-3xl mx-auto relative">
            <Textarea
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Enter command or natural language instruction..."
              className="min-h-[100px] w-full resize-none border-slate-200 bg-slate-50 rounded-sm p-4 text-sm font-outfit focus:border-slate-900 focus:ring-0 transition-colors pb-14"
              disabled={isLoading || isPlaygroundInitializing}
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
                disabled={!inputValue.trim() || isLoading || isPlaygroundInitializing}
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
