'use client'

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
  Loader2,
  ChevronDown,
  ChevronUp,
  LogOut,
  History,
  Trash2,
} from 'lucide-react'
import { Message } from '@/types/conversation'
import { DEFAULT_GATEWAY_MODEL_ID } from '@/lib/ai/constants'
import { createSupabaseBrowserClient } from '@/lib/supabase/browser'
import {
  makeStoredSessionPayload,
  memoryFromStored,
  rowToSavedConversation,
  type ChatSessionRow,
} from '@/lib/chatSessions'
import { titleGenerator } from '@/lib/titleGenerator'
import type { SavedConversation } from '@/types/conversation'

interface ChatInterfaceProps {
  className?: string
}

type RuntimeLogLevel = 'info' | 'success' | 'warn' | 'error'

type PipelineStage = 'idle' | 'prepare' | 'dispatch' | 'waiting' | 'complete' | 'error'

interface RuntimeLogEntry {
  id: string
  timestamp: string
  level: RuntimeLogLevel
  message: string
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
    name: 'Create Incident',
    description: 'Log a new Sev1 or critical incident.',
    prompt: `I need to log a new incident. Please call create_incident with this context:
Customer: 
Description: 
Severity: 
Status: investigating`
  },
  {
    name: 'Get Incident',
    description: 'Retrieve details of a specific incident.',
    prompt: `Please fetch the details for incident ID: `
  },
  {
    name: 'List Incidents',
    description: 'List all currently tracked incidents.',
    prompt: `Please call list_incidents to show all currently tracked incidents.`
  },
  {
    name: 'Update Incident',
    description: 'Update status or details of an existing incident.',
    prompt: `I need to update an incident. Please call update_incident.
Incident ID: 
New Status: `
  },
  {
    name: 'Generate CAN Document',
    description: 'Generate a Customer Alert Notice.',
    prompt: `Please call generate_can_document using the current incident context to create a Customer Alert Notice.`
  },
  {
    name: 'Generate RCA Document',
    description: 'Generate a Root Cause Analysis report.',
    prompt: `Please call generate_rca_document using the current incident context to create a Root Cause Analysis report.`
  },
  {
    name: 'Get System Status',
    description: 'Check the health of a specific system.',
    prompt: `Please check the system status for: `
  },
  {
    name: 'Calculate Downtime',
    description: 'Calculate SLA impact and downtime duration.',
    prompt: `Please calculate the downtime for incident ID: `
  }
];

const WELCOME_CONTENT =
  'Playground initialized. LangChain orchestrator connected. Vercel AI Gateway nominal.\n\nReady to triage incidents or execute MCP tool workflows. How should we proceed?'
const CLIENT_HISTORY_WINDOW = 50

export default function ChatInterface({ className }: ChatInterfaceProps) {
  const router = useRouter()
  const supabase = useMemo(() => createSupabaseBrowserClient(), [])

  const [messages, setMessages] = useState<Message[]>([])
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [currentTypingMessageId, setCurrentTypingMessageId] = useState<string | null>(null)
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null)
  const [pastSessions, setPastSessions] = useState<SavedConversation[]>([])
  const [sessionsLoading, setSessionsLoading] = useState(true)
  const [chatQuota, setChatQuota] = useState<{
    max: number
    remaining: number
    reset_at: string | null
    authenticated: boolean
  } | null>(null)
  const [quotaExtensionEnabled, setQuotaExtensionEnabled] = useState(false)
  const [quotaExtensionCredits, setQuotaExtensionCredits] = useState(5)
  const [extendModalOpen, setExtendModalOpen] = useState(false)
  const [extendPassword, setExtendPassword] = useState('')
  const [extendSubmitting, setExtendSubmitting] = useState(false)
  const [extendModalError, setExtendModalError] = useState<string | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)
  const [thinkingStartTime, setThinkingStartTime] = useState<number | null>(null)
  const [isToolsCollapsed, setIsToolsCollapsed] = useState(false)
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
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const [runtimeLogs, setRuntimeLogs] = useState<RuntimeLogEntry[]>([
    {
      id: 'boot',
      timestamp: 'INIT',
      level: 'info',
      message: 'Runtime channel ready. Awaiting operator input.',
    },
  ])
  const [pipelineStage, setPipelineStage] = useState<PipelineStage>('idle')

  const isPlaygroundInitializing =
    serverStatus.llm === 'loading' || serverStatus.mcp === 'loading'

  const refreshPastSessions = useCallback(async () => {
    if (!supabase) {
      return
    }
    const { data, error } = await supabase
      .from('chat_sessions')
      .select('id,user_id,title,messages,created_at,updated_at')
      .order('updated_at', { ascending: false })
    if (error) {
      console.error('Failed to load chat sessions', error)
      return
    }
    const rows = (data ?? []) as ChatSessionRow[]
    setPastSessions(rows.map((r) => rowToSavedConversation(r)))
  }, [supabase])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      if (!supabase) {
        setSessionsLoading(false)
        return
      }
      setSessionsLoading(true)
      await refreshPastSessions()
      if (!cancelled) {
        setSessionsLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [refreshPastSessions, supabase])

  useEffect(() => {
    setPlaygroundInitClock(formatMessageTime(new Date()))
  }, [])

  const scrollToBottom = () => {
    const container = messagesContainerRef.current
    if (!container) return
    // Jump instead of smooth-scrolling to avoid repeated animation flicker during fast updates.
    container.scrollTo({ top: container.scrollHeight, behavior: 'auto' })
  }

  const pushRuntimeLog = useCallback((message: string, level: RuntimeLogLevel = 'info') => {
    setRuntimeLogs((prev) => {
      const next: RuntimeLogEntry = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        timestamp: formatMessageTime(new Date()),
        level,
        message,
      }
      return [...prev.slice(-79), next]
    })
  }, [])

  const [thinkingMessage, setThinkingMessage] = useState<string>("Processing request...")

  // Add initial message ONLY when we know the LLM status is healthy
  useEffect(() => {
    if (serverStatus.llm === 'healthy' && messages.length === 0) {
      setMessages([
        {
          id: '1',
          content: WELCOME_CONTENT,
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
    const hasUserMessage = messages.some((m) => m.sender === 'user')
    if (!hasUserMessage || !supabase) {
      return
    }

    const handle = window.setTimeout(async () => {
      const title = titleGenerator.generateTitle(messages)
      const payload = makeStoredSessionPayload(messages)
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        return
      }

      if (currentConversationId) {
        const { data: existingRow } = await supabase
          .from('chat_sessions')
          .select('messages')
          .eq('id', currentConversationId)
          .maybeSingle()
        const persistedMemory = memoryFromStored(existingRow?.messages)
        const { error } = await supabase
          .from('chat_sessions')
          .update({
            title,
            messages: makeStoredSessionPayload(messages, persistedMemory),
          })
          .eq('id', currentConversationId)
        if (error) {
          console.error('Failed to update chat session', error)
        }
      } else {
        const { data, error } = await supabase
          .from('chat_sessions')
          .insert({
            user_id: user.id,
            title,
            messages: payload,
          })
          .select('id')
          .single()
        if (error) {
          console.error('Failed to insert chat session', error)
          return
        }
        if (data?.id) {
          setCurrentConversationId(data.id as string)
        }
      }
      await refreshPastSessions()
    }, 1500)

    return () => window.clearTimeout(handle)
  }, [messages, currentConversationId, supabase, refreshPastSessions])

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
    pushRuntimeLog('Operator halted active generation request.', 'warn')
    setPipelineStage('idle')
    abortControllerRef.current?.abort()
  }

  useEffect(() => {
    const checkServerStatus = async () => {
      try {
        const response = await fetch('/api/chat', { credentials: 'same-origin' })
        if (response.ok) {
          const data = (await response.json()) as {
            llm_status?: string
            mcp_status?: string
            llm_error?: string
            mcp_error?: string
            error?: string
            current_model?: string
            quota_extension_enabled?: boolean
            quota_extension_credits?: number
            chat_quota?: {
              max: number
              remaining: number
              reset_at: string | null
              authenticated: boolean
            }
          }
          if (typeof data.quota_extension_enabled === 'boolean') {
            setQuotaExtensionEnabled(data.quota_extension_enabled)
          }
          if (
            typeof data.quota_extension_credits === 'number' &&
            data.quota_extension_credits > 0
          ) {
            setQuotaExtensionCredits(data.quota_extension_credits)
          }
          setServerStatus((prev) => {
            const next = {
              llm: data.llm_status === 'healthy' ? 'healthy' : 'error',
              mcp: data.mcp_status === 'healthy' ? 'healthy' : 'error',
              llmError: data.llm_error ?? data.error,
              mcpError: data.mcp_error
            } as typeof prev
            if (
              prev.llm === next.llm &&
              prev.mcp === next.mcp &&
              prev.llmError === next.llmError &&
              prev.mcpError === next.mcpError
            ) {
              return prev
            }
            return next
          })
          if (data.current_model?.trim()) {
            setGatewayModelLabel(data.current_model.trim())
          }
          if (data.chat_quota) {
            const incomingQuota = data.chat_quota
            setChatQuota((prev) => {
              if (
                prev &&
                prev.max === incomingQuota.max &&
                prev.remaining === incomingQuota.remaining &&
                prev.reset_at === incomingQuota.reset_at &&
                prev.authenticated === incomingQuota.authenticated
              ) {
                return prev
              }
              return incomingQuota
            })
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

  const quotaBlocksSend =
    chatQuota !== null && chatQuota.authenticated && chatQuota.remaining <= 0

  const loadSession = async (id: string) => {
    if (!supabase) {
      return
    }
    const { data, error } = await supabase
      .from('chat_sessions')
      .select('*')
      .eq('id', id)
      .maybeSingle()
    if (error || !data) {
      console.error('Failed to load session', error)
      return
    }
    const conv = rowToSavedConversation(data as ChatSessionRow)
    setCurrentConversationId(conv.id)
    if (conv.messages.length > 0) {
      setMessages(conv.messages)
    } else {
      setMessages([
        {
          id: Date.now().toString(),
          content: WELCOME_CONTENT,
          sender: 'ai',
          timestamp: new Date(),
          metadata: {
            model: gatewayModelLabel ?? DEFAULT_GATEWAY_MODEL_ID,
          },
        },
      ])
    }
    setError(null)
    setCurrentTypingMessageId(null)
    setIsLoading(false)
    setThinkingStartTime(null)
  }

  const deleteSession = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!supabase) {
      return
    }
    const { error } = await supabase.from('chat_sessions').delete().eq('id', id)
    if (error) {
      console.error('Failed to delete session', error)
      return
    }
    if (currentConversationId === id) {
      handleNewConversation()
    }
    await refreshPastSessions()
  }

  const handleSignOut = async () => {
    if (supabase) {
      await supabase.auth.signOut()
    }
    router.push('/login')
    router.refresh()
  }

  const handleQuotaExtendSubmit = async () => {
    setExtendSubmitting(true)
    setExtendModalError(null)
    try {
      const res = await fetch('/api/chat/quota/extend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ password: extendPassword }),
      })
      const payload = (await res.json().catch(() => ({}))) as {
        error?: string
        chat_quota?: {
          max: number
          remaining: number
          reset_at: string | null
          authenticated: boolean
        }
      }
      if (!res.ok) {
        setExtendModalError(payload.error ?? 'Request failed')
        return
      }
      if (payload.chat_quota) {
        setChatQuota(payload.chat_quota)
      }
      setExtendModalOpen(false)
      setExtendPassword('')
      setError(null)
    } catch {
      setExtendModalError('Network error')
    } finally {
      setExtendSubmitting(false)
    }
  }

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading || isPlaygroundInitializing || quotaBlocksSend) return

    const userMessage: Message = {
      id: Date.now().toString(),
      content: inputValue,
      sender: 'user',
      timestamp: new Date()
    }

    const messageToSend = inputValue
    const newMessages = [...messages, userMessage]
    setPipelineStage('prepare')
    pushRuntimeLog('Prompt accepted. Packaging context and conversation window.', 'info')
    setMessages(newMessages)
    setInputValue('')
    setIsLoading(true)
    setThinkingStartTime(Date.now())
    setError(null)

    const controller = new AbortController()
    abortControllerRef.current = controller

    let suppressChatErrorBubble = false

    try {
      setPipelineStage('dispatch')
      pushRuntimeLog('Dispatching request to /api/chat (Vercel AI Gateway path).', 'info')
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'same-origin',
        signal: controller.signal,
        body: JSON.stringify({
          message: messageToSend,
          conversationHistory: messages.slice(-CLIENT_HISTORY_WINDOW),
          conversationId: currentConversationId,
          userContext: context
        }),
      })

      if (response.status === 401) {
        router.push('/login?next=/chat')
        throw new Error('Session expired. Please sign in again.')
      }

      if (!response.ok) {
        const errorData = (await response.json().catch(() => ({}))) as {
          error?: string
          code?: string
          resetAt?: string
          remaining?: number
          max?: number
        }
        if (response.status === 429 && errorData.code === 'CHAT_QUOTA_EXCEEDED') {
          suppressChatErrorBubble = true
          const cap =
            typeof errorData.max === 'number' && errorData.max > 0 ? errorData.max : 15
          setChatQuota((prev) =>
            prev
              ? {
                  ...prev,
                  max: cap,
                  remaining: errorData.remaining ?? 0,
                  reset_at: errorData.resetAt ?? prev.reset_at,
                }
              : {
                  max: cap,
                  remaining: errorData.remaining ?? 0,
                  reset_at: errorData.resetAt ?? null,
                  authenticated: true,
                }
          )
          throw new Error(
            errorData.error ??
              'Daily chat limit reached. Try again after the window resets.'
          )
        }
        throw new Error(errorData.error || 'Failed to get AI response')
      }

      const data = (await response.json()) as {
        content?: string
        context?: Record<string, unknown>
        model?: string
        metadata?: {
          provider?: string
          elapsedMs?: number
          langsmith?: {
            traceId: string
            rootRunId: string
            projectName: string
            langsmithHost: string
          }
        }
      }
      setPipelineStage('waiting')
      pushRuntimeLog('Response received. Integrating model output and tool metadata.', 'info')
      if (data.context) {
        setContext(data.context)
      }

      const ls = data.metadata?.langsmith
      if (ls?.traceId) {
        pushRuntimeLog(
          `LangSmith: trace ${ls.traceId} · root run ${ls.rootRunId} · project "${ls.projectName}"`,
          'success'
        )
        pushRuntimeLog(
          `View in LangSmith: open ${ls.langsmithHost} and search by trace id, or open project "${ls.projectName}".`,
          'info'
        )
      }
      
      const aiMessageId = (Date.now() + 1).toString()
      const aiResponse: Message = {
        id: aiMessageId,
        content: typeof data.content === "string" ? data.content : "",
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
      setPipelineStage('complete')
      pushRuntimeLog('Assistant response rendered to chat stream.', 'success')

      void fetch('/api/chat', { credentials: 'same-origin' })
        .then((r) => (r.ok ? r.json() : null))
        .then(
          (
            d: {
              chat_quota?: {
                max: number
                remaining: number
                reset_at: string | null
                authenticated: boolean
              }
            } | null
          ) => {
            if (d?.chat_quota) {
              setChatQuota(d.chat_quota)
            }
          }
        )
        .catch(() => {})
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        setIsLoading(false)
        setThinkingStartTime(null)
        setPipelineStage('idle')
        pushRuntimeLog('Request aborted before completion.', 'warn')
        return
      }
      console.error('Error sending message:', error)
      setError(error instanceof Error ? error.message : 'System fault')
      setIsLoading(false)
      setThinkingStartTime(null)
      setPipelineStage('error')
      pushRuntimeLog(
        `Pipeline error: ${error instanceof Error ? error.message : 'System fault'}`,
        'error'
      )

      if (!suppressChatErrorBubble) {
        const errorMessage: Message = {
          id: (Date.now() + 1).toString(),
          content:
            'System Error: Failed to execute operational loop. Verify Gateway credentials and MCP transport.',
          sender: 'ai',
          timestamp: new Date(),
        }
        setMessages((prev) => [...prev, errorMessage])
      }
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
    setCurrentConversationId(null)
    setMessages([
      {
        id: Date.now().toString(),
        content: WELCOME_CONTENT,
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
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" className="h-6 w-6 text-slate-400 hover:text-slate-900 rounded-sm">
                <Settings className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          <Button 
            onClick={handleNewConversation}
            className="w-full bg-slate-950 hover:bg-slate-800 text-white rounded-sm font-medium text-xs tracking-widest uppercase h-10" 
          >
            <Plus className="h-4 w-4 mr-2" />
            New Session
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => void handleSignOut()}
            className="mt-3 w-full h-10 rounded-sm border-red-200 bg-red-50 text-red-700 hover:bg-red-100 hover:text-red-800 font-medium text-xs tracking-widest uppercase"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </Button>

          <div className="mt-6 space-y-3">
            <h3 className="text-[10px] font-mono text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <History className="h-3 w-3" />
              Past Sessions
            </h3>
            <div className="max-h-40 overflow-y-auto space-y-1 pr-1">
              {!supabase ? (
                <p className="text-[11px] font-outfit text-amber-800 bg-amber-50 border border-amber-100 rounded-sm px-2 py-2">
                  Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to load saved sessions.
                </p>
              ) : sessionsLoading ? (
                <p className="text-[11px] font-outfit text-slate-500">Loading…</p>
              ) : pastSessions.length === 0 ? (
                <p className="text-[11px] font-outfit text-slate-500">No saved sessions yet.</p>
              ) : (
                pastSessions.map((s) => (
                  <div
                    key={s.id}
                    className={`group flex items-stretch gap-1 rounded-sm border ${
                      currentConversationId === s.id
                        ? 'border-slate-900 bg-white'
                        : 'border-slate-200 bg-white hover:border-slate-400'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => void loadSession(s.id)}
                      className="min-w-0 flex-1 text-left px-3 py-2"
                    >
                      <div className="truncate font-mono text-[11px] font-semibold text-slate-900">
                        {s.title}
                      </div>
                      <div className="text-[10px] font-mono text-slate-400">
                        {s.messageCount} msgs · {formatMessageTime(s.updatedAt)}
                      </div>
                    </button>
                    <button
                      type="button"
                      title="Delete session"
                      onClick={(e) => void deleteSession(s.id, e)}
                      className="shrink-0 px-2 text-slate-300 hover:text-red-600 transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>

        {/* Runtime logs */}
        <div className="flex-1 border-t border-slate-100 p-6 min-h-0 flex flex-col">
          <h3 className="text-[10px] font-mono text-slate-400 uppercase tracking-widest mb-3">
            Runtime Logs
          </h3>
          <div className="flex-1 min-h-0 overflow-y-auto rounded-sm border border-slate-200 bg-white p-3 space-y-2">
            {runtimeLogs.map((entry) => (
              <div key={entry.id} className="text-[10px] font-mono leading-relaxed">
                <span className="text-slate-400">[{entry.timestamp}]</span>{' '}
                <span
                  className={
                    entry.level === 'error'
                      ? 'text-red-600'
                      : entry.level === 'warn'
                        ? 'text-amber-600'
                        : entry.level === 'success'
                          ? 'text-emerald-600'
                          : 'text-slate-500'
                  }
                >
                  {entry.message}
                </span>
              </div>
            ))}
          </div>
          <div className="mt-3 rounded-sm border border-slate-200 bg-slate-50 px-3 py-2">
            <p className="text-[10px] font-mono uppercase tracking-widest text-slate-400">Pipeline status</p>
            <p className="mt-1 text-[11px] font-outfit text-slate-700 leading-relaxed">
              {pipelineStage === 'idle'
                ? 'Waiting for your next message. No model request in-flight.'
                : pipelineStage === 'prepare'
                  ? 'Preparing payload, collecting recent conversation context, and validating quota.'
                  : pipelineStage === 'dispatch'
                    ? 'Sending request to the chat API and routing it through the configured model gateway.'
                    : pipelineStage === 'waiting'
                      ? 'Model output received; assembling response text, metadata, and tool context.'
                      : pipelineStage === 'complete'
                        ? 'Response delivered successfully. Logs remain available for inspection.'
                        : 'Pipeline interrupted due to an error. Review the latest log line for details.'}
            </p>
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
            <div className="hidden items-center gap-2 md:flex">
              <span
                className={`inline-flex items-center rounded-sm border px-2 py-1 text-[10px] font-mono uppercase tracking-widest ${
                  serverStatus.llm === 'healthy'
                    ? 'border-emerald-200 text-emerald-700 bg-emerald-50'
                    : serverStatus.llm === 'loading'
                      ? 'border-amber-200 text-amber-700 bg-amber-50'
                      : 'border-red-200 text-red-700 bg-red-50'
                }`}
              >
                Gateway {serverStatus.llm === 'healthy' ? 'Online' : serverStatus.llm === 'loading' ? 'Loading' : 'Err'}
              </span>
              <span
                className={`inline-flex items-center rounded-sm border px-2 py-1 text-[10px] font-mono uppercase tracking-widest ${
                  serverStatus.mcp === 'healthy'
                    ? 'border-emerald-200 text-emerald-700 bg-emerald-50'
                    : serverStatus.mcp === 'loading'
                      ? 'border-amber-200 text-amber-700 bg-amber-50'
                      : 'border-red-200 text-red-700 bg-red-50'
                }`}
              >
                Transport {serverStatus.mcp === 'healthy' ? 'Online' : serverStatus.mcp === 'loading' ? 'Loading' : 'Err'}
              </span>
              {chatQuota?.authenticated && (
                <span className="inline-flex items-center rounded-sm border border-slate-200 bg-slate-50 px-2 py-1 text-[10px] font-mono uppercase tracking-widest text-slate-600">
                  Quota {chatQuota.remaining}/{chatQuota.max}
                </span>
              )}
            </div>
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
        <div ref={messagesContainerRef} className="min-h-0 flex-1 overflow-y-auto px-8 py-8 scrollbar-none">
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
                  <motion.div
                    animate={{ scale: [1, 1.12, 1], opacity: [0.7, 1, 0.7] }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'easeInOut' }}
                  >
                    <Activity className="h-4 w-4 text-blue-500" />
                  </motion.div>
                  <span className="inline-flex items-center">
                    <span>{thinkingMessage.replace(/\.\.\.$/, '')}</span>
                    <span className="ml-1 inline-flex w-4 justify-start">
                      {[0, 1, 2].map((dot) => (
                        <motion.span
                          key={dot}
                          className="inline-block"
                          animate={{ opacity: [0.2, 1, 0.2], y: [0, -1, 0] }}
                          transition={{
                            duration: 0.9,
                            repeat: Infinity,
                            ease: 'easeInOut',
                            delay: dot * 0.15,
                          }}
                        >
                          .
                        </motion.span>
                      ))}
                    </span>
                  </span>
                </div>
              </motion.div>
            )}
            <div ref={messagesEndRef} className="h-4" />
          </div>
        </div>

        {/* Input Area — pinned to bottom of chat column (viewport below navbar) */}
        <div className="shrink-0 border-t border-slate-200 bg-white p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] shadow-[0_-8px_30px_-12px_rgba(15,23,42,0.12)] sm:p-8 sm:pb-[max(2rem,env(safe-area-inset-bottom))]">
          <div className="max-w-3xl mx-auto relative">
            {quotaBlocksSend && (
              <div className="mb-3 rounded-sm border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-outfit text-amber-950 space-y-3">
                <p className="leading-relaxed">
                  Daily chat quota reached for this account. Usage resets after the rolling window
                  {chatQuota?.reset_at
                    ? ` (approximately ${new Date(chatQuota.reset_at).toLocaleString()})`
                    : ''}
                  .
                </p>
                {quotaExtensionEnabled && (
                  <Button
                    type="button"
                    variant="outline"
                    className="h-9 rounded-sm border-amber-300 bg-white text-amber-950 hover:bg-amber-100 text-[11px] font-mono uppercase tracking-widest"
                    onClick={() => {
                      setExtendModalOpen(true)
                      setExtendModalError(null)
                      setExtendPassword('')
                    }}
                  >
                    Extend quota (+{quotaExtensionCredits})
                  </Button>
                )}
              </div>
            )}
            <div className="mb-3 rounded-sm border border-slate-200 bg-slate-50 p-3">
              <button
                onClick={() => setIsToolsCollapsed(!isToolsCollapsed)}
                className="w-full flex items-center justify-between group"
                aria-expanded={!isToolsCollapsed}
                aria-label="Toggle quick tools"
              >
                <div className="flex items-center gap-2">
                  <Wrench className="h-3.5 w-3.5 text-slate-700" />
                  <span className="text-[10px] font-mono uppercase tracking-widest text-slate-600">
                    Quick Tools
                  </span>
                </div>
                {isToolsCollapsed ? (
                  <ChevronDown className="h-4 w-4 text-slate-500" />
                ) : (
                  <ChevronUp className="h-4 w-4 text-slate-500" />
                )}
              </button>
              <motion.div
                initial={false}
                animate={{
                  height: isToolsCollapsed ? 0 : 'auto',
                  opacity: isToolsCollapsed ? 0 : 1,
                }}
                transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                className="overflow-hidden"
              >
                <div className="mt-2 flex flex-wrap gap-2">
                  {availableTools.map((tool) => (
                    <button
                      key={tool.name}
                      type="button"
                      onClick={() => insertToolPrompt(tool.prompt)}
                      className="rounded-sm border border-slate-300 bg-white px-2.5 py-1.5 text-[10px] font-mono uppercase tracking-widest text-slate-700 hover:border-slate-900 hover:text-slate-900 transition-colors"
                      title={tool.description}
                    >
                      {tool.name}
                    </button>
                  ))}
                </div>
              </motion.div>
            </div>
            <Textarea
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Enter command or natural language instruction..."
              className="min-h-[100px] max-h-[40vh] w-full resize-none overflow-y-auto [field-sizing:fixed] border-slate-200 bg-slate-50 rounded-sm p-4 text-sm font-outfit focus:border-slate-900 focus:ring-0 transition-colors pb-14"
              disabled={isLoading || isPlaygroundInitializing || quotaBlocksSend}
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
                disabled={
                  !inputValue.trim() || isLoading || isPlaygroundInitializing || quotaBlocksSend
                }
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

      {extendModalOpen && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-950/50 p-4"
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget && !extendSubmitting) {
              setExtendModalOpen(false)
            }
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="quota-extend-title"
            className="w-full max-w-md rounded-sm border border-slate-200 bg-white p-6 shadow-xl"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <h2
              id="quota-extend-title"
              className="text-sm font-outfit font-semibold text-slate-900"
            >
              Extend daily quota
            </h2>
            <p className="mt-2 text-xs text-slate-600 font-light leading-relaxed">
              Enter the extension passphrase to add {quotaExtensionCredits} more messages within the
              current rolling window. This is intentionally not advertised publicly so casual visitors
              stay within the default limit.
            </p>
            <label htmlFor="quota-extend-pass" className="mt-4 block text-[10px] font-mono uppercase tracking-widest text-slate-500">
              Passphrase
            </label>
            <Input
              id="quota-extend-pass"
              type="password"
              autoComplete="off"
              value={extendPassword}
              onChange={(e) => setExtendPassword(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !extendSubmitting) {
                  e.preventDefault()
                  void handleQuotaExtendSubmit()
                }
              }}
              className="mt-1.5 rounded-sm border-slate-200"
              disabled={extendSubmitting}
            />
            {extendModalError && (
              <p className="mt-2 text-xs font-mono text-red-600" role="alert">
                {extendModalError}
              </p>
            )}
            <div className="mt-6 flex flex-wrap justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                className="rounded-sm text-xs font-mono uppercase"
                disabled={extendSubmitting}
                onClick={() => setExtendModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                className="inline-flex items-center rounded-sm bg-slate-950 text-white text-xs font-mono uppercase hover:bg-slate-800"
                disabled={extendSubmitting || !extendPassword.trim()}
                onClick={() => void handleQuotaExtendSubmit()}
              >
                {extendSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                    Applying
                  </>
                ) : (
                  'Proceed'
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
