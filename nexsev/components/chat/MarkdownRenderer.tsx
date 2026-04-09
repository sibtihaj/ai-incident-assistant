'use client'

import React, { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { ChevronDown, ChevronRight, Copy, Check } from 'lucide-react'

// Function to convert template JSON to readable text format
function formatTemplateAsText(templateData: any): string {
  if (Array.isArray(templateData)) {
    return templateData.map(formatTemplateAsText).join('\n\n')
  }
  
  if (typeof templateData === 'object' && templateData !== null) {
    let result = ''
    
    // Handle template objects
    if (templateData.id && templateData.name) {
      result += `# ${templateData.name}\n\n`
      if (templateData.description) {
        result += `**Description:** ${templateData.description}\n\n`
      }
      if (templateData.type) {
        result += `**Type:** ${templateData.type.toUpperCase()}\n\n`
      }
    }
    
    // Handle template content
    if (templateData.template) {
      result += formatTemplateContent(templateData.template)
    }
    
    return result
  }
  
  return String(templateData)
}

// Function to format template content recursively
function formatTemplateContent(content: any, indent = 0): string {
  if (typeof content === 'string') {
    return content
  }
  
  if (Array.isArray(content)) {
    return content.map(item => formatTemplateContent(item, indent)).join('\n')
  }
  
  if (typeof content === 'object' && content !== null) {
    let result = ''
    const spaces = '  '.repeat(indent)
    
    for (const [key, value] of Object.entries(content)) {
      const formattedKey = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
      
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        result += `${spaces}## ${formattedKey}\n`
        result += formatTemplateContent(value, indent + 1)
      } else if (Array.isArray(value)) {
        result += `${spaces}## ${formattedKey}\n`
        if (value.length === 0) {
          result += `${spaces}- (Empty list)\n`
        } else {
          value.forEach(item => {
            result += `${spaces}- ${formatTemplateContent(item, indent + 1)}\n`
          })
        }
      } else if (typeof value === 'string' && value.trim() !== '') {
        result += `${spaces}**${formattedKey}:** ${value}\n`
      } else if (typeof value === 'boolean') {
        result += `${spaces}**${formattedKey}:** ${value ? 'Yes' : 'No'}\n`
      }
    }
    
    return result
  }
  
  return String(content)
}

// Template Renderer Component
function TemplateRenderer({ content }: { content: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  return (
    <div className="template-renderer">
      <div className="template-header">
        <div className="template-title">
          <h3>📋 Template</h3>
        </div>
        <button
          onClick={handleCopy}
          className="copy-button"
          title="Copy template"
        >
          {copied ? <Check size={16} /> : <Copy size={16} />}
        </button>
      </div>
      <div className="template-content">
        <ReactMarkdown
          components={{
            code({ className, children, ...props }: any) {
              const match = /language-(\w+)/.exec(className || '')
              return match ? (
                <SyntaxHighlighter
                  style={vscDarkPlus}
                  language={match[1]}
                  PreTag="div"
                  customStyle={{
                    margin: 0,
                    borderRadius: '6px',
                    fontSize: '14px',
                    whiteSpace: 'pre-wrap',
                    wordWrap: 'break-word',
                    overflowWrap: 'break-word',
                    maxWidth: '100%',
                    width: '100%'
                  } as any}
                  {...props}
                >
                  {String(children).replace(/\n$/, '')}
                </SyntaxHighlighter>
              ) : (
                <code className={className} {...props}>
                  {children}
                </code>
              )
            }
          }}
        >
          {content}
        </ReactMarkdown>
      </div>
    </div>
  )
}

interface MarkdownRendererProps {
  content: string
  className?: string
  inheritTextColor?: boolean
}

// Function to detect and parse JSON content
function parseJsonContent(content: string): { isJson: boolean; parsedData: any; originalContent: string } {
  try {
    // Check if content starts with "Tool result:" and contains JSON
    if (content.startsWith('Tool result:')) {
      const jsonStart = content.indexOf('{')
      if (jsonStart !== -1) {
        const jsonString = content.substring(jsonStart)
        const parsed = JSON.parse(jsonString)
        return { isJson: true, parsedData: parsed, originalContent: content }
      }
    }
    
    // Check if content is pure JSON (most common case now)
    const parsed = JSON.parse(content)
    return { isJson: true, parsedData: parsed, originalContent: content }
  } catch {
    return { isJson: false, parsedData: null, originalContent: content }
  }
}

// Component for rendering JSON data with collapsible sections
function JsonRenderer({ data, title = "JSON Data" }: { data: any; title?: string }) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [copied, setCopied] = useState(false)

  // Extract meaningful information from tool results
  const getToolResultSummary = (data: any) => {
    if (data?.content && Array.isArray(data.content)) {
      const firstContent = data.content[0]
      if (firstContent?.text) {
        try {
          // Check if text is already parsed JSON (from our special handling)
          let parsedText
          if (typeof firstContent.text === 'object') {
            // Already parsed by our special handling
            parsedText = firstContent.text
          } else {
            // Still a string, need to parse
            let unescaped = firstContent.text
              .replace(/\\\\/g, '\\')
              .replace(/\\"/g, '"')
              .replace(/\\n/g, '\n')
              .replace(/\\t/g, '\t')
            
            parsedText = JSON.parse(unescaped)
          }
          
          if (Array.isArray(parsedText) && parsedText.length > 0) {
            const firstItem = parsedText[0]
            return {
              type: firstItem.type || 'Unknown',
              name: firstItem.name || 'No name',
              description: firstItem.description || 'No description'
            }
          }
        } catch {
          // If parsing fails, return the raw text
          return {
            type: 'Text',
            name: 'Tool Response',
            description: firstContent.text.substring(0, 100) + (firstContent.text.length > 100 ? '...' : '')
          }
        }
      }
    }
    return null
  }

  const summary = getToolResultSummary(data)

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(data, null, 2))
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  return (
    <div className="my-4 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden json-renderer">
      <div 
        className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors json-header"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center space-x-2">
          {isExpanded ? (
            <ChevronDown className="h-4 w-4 text-gray-500" />
          ) : (
            <ChevronRight className="h-4 w-4 text-gray-500" />
          )}
          <div className="flex flex-col">
            <span className="font-medium text-sm text-gray-700 dark:text-gray-300">{title}</span>
            {summary && !isExpanded && (
              <span className="text-xs text-gray-500">
                {summary.type}: {summary.name}
              </span>
            )}
          </div>
          <span className="text-xs text-gray-500 bg-gray-200 dark:bg-gray-600 px-2 py-1 rounded">
            {typeof data === 'object' ? 'Object' : typeof data}
          </span>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation()
            copyToClipboard()
          }}
          className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-colors"
        >
          {copied ? (
            <Check className="h-4 w-4 text-green-500" />
          ) : (
            <Copy className="h-4 w-4 text-gray-500" />
          )}
        </button>
      </div>
      {isExpanded && (
        <div className="json-content">
          <SyntaxHighlighter
            style={vscDarkPlus}
            language="json"
            PreTag="div"
            className="text-sm border-0 font-mono !mt-0"
            customStyle={{
              margin: 0,
              background: '#1e1e1e',
              padding: '1rem',
              fontFamily: 'Fira Mono, Menlo, Monaco, Consolas, monospace',
              color: '#d4d4d4',
              whiteSpace: 'pre-wrap',
              wordWrap: 'break-word',
              overflowWrap: 'break-word',
              maxWidth: '100%',
              width: '100%'
            }}
          >
            {JSON.stringify(data, null, 2)}
          </SyntaxHighlighter>
        </div>
      )}
    </div>
  )
}

export default function MarkdownRenderer({ content, className = '', inheritTextColor = false }: MarkdownRendererProps) {
  // Check if content contains JSON
  const { isJson, parsedData, originalContent } = parseJsonContent(content)

  // If it's JSON, render it with our custom JSON renderer
  if (isJson) {
    return (
      <div className={`markdown-content ${className}`}>
        <JsonRenderer data={parsedData} title="Tool Result" />
      </div>
    )
  }

  // Special handling for tool results that contain JSON in the text field
  try {
    const parsed = JSON.parse(content)
    if (parsed?.content && Array.isArray(parsed.content) && parsed.content[0]?.text) {
      // This is a tool result with JSON in the text field
      try {
        // Parse the JSON string in the text field
        const textContent = parsed.content[0].text
        const parsedTextContent = JSON.parse(textContent)
        
        // Convert to text format
        const textFormatted = formatTemplateAsText(parsedTextContent)
        
        return (
          <div className={`markdown-content ${className}`}>
            <TemplateRenderer content={textFormatted} />
          </div>
        )
      } catch {
        // If parsing the text content fails, check if it's already formatted text
        const textContent = parsed.content[0].text
        if (textContent.includes('# CUSTOMER ALERT NOTICE') || 
            textContent.includes('# ROOT CAUSE ANALYSIS') ||
            textContent.includes('# CAN Report')) {
          // This is already formatted text from our tools
          return (
            <div className={`markdown-content ${className}`}>
              <TemplateRenderer content={textContent} />
            </div>
          )
        }
        // Show the original
        return (
          <div className={`markdown-content ${className}`}>
            <JsonRenderer data={parsed} title="Tool Result" />
          </div>
        )
      }
    }
  } catch {
    // Not JSON, continue with normal markdown rendering
  }

  return (
    <div className={`markdown-content ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight]}
        components={{
          // Code blocks
          code({ className, children, ...props }: any) {
            const match = /language-(\w+)/.exec(className || '')
            const language = match ? match[1] : ''
            const isInline = !className
            
            return !isInline ? (
              <div className="relative my-4 overflow-hidden">
                <div className="flex items-center justify-between bg-gray-800 text-gray-200 px-4 py-2 rounded-t-lg border border-gray-700">
                  <span className="text-xs font-mono uppercase tracking-wide text-gray-300">{language || 'text'}</span>
                  <div className="flex space-x-1">
                    <div className="w-3 h-3 rounded-full bg-red-500"></div>
                    <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                    <div className="w-3 h-3 rounded-full bg-green-500"></div>
                  </div>
                </div>
                <div>
                  <SyntaxHighlighter
                    style={vscDarkPlus}
                    language={language || 'json'}
                    PreTag="div"
                    className="rounded-t-none rounded-b-lg text-sm border-x border-b border-gray-700 font-mono !mt-0"
                    customStyle={{
                      margin: 0,
                      borderTopLeftRadius: 0,
                      borderTopRightRadius: 0,
                      background: '#1e1e1e',
                      padding: '1rem',
                      width: '100%',
                      maxWidth: '100%',
                      fontFamily: 'Fira Mono, Menlo, Monaco, Consolas, monospace',
                      color: '#d4d4d4',
                      whiteSpace: 'pre-wrap',
                      wordWrap: 'break-word',
                      overflowWrap: 'break-word'
                    }}
                  >
                    {String(children).replace(/\n$/, '')}
                  </SyntaxHighlighter>
                </div>
              </div>
            ) : (
              <code 
                className={`
                  ${inheritTextColor 
                    ? 'bg-white/20 text-white/90 border border-white/30' 
                    : 'bg-gray-100 text-gray-800 border border-gray-300 dark:bg-gray-800 dark:text-gray-200 dark:border-gray-600'
                  } 
                  px-1.5 py-0.5 rounded text-sm font-mono font-medium
                `}
                style={{ fontFamily: 'Fira Mono, Menlo, Monaco, Consolas, monospace' }}
                {...props}
              >
                {children}
              </code>
            )
          },
          // Headers
          h1: ({ children }) => (
            <h1 className={`text-2xl font-bold mb-4 mt-6 ${inheritTextColor ? 'text-current' : 'text-gray-900 dark:text-gray-100'}`}>
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className={`text-xl font-bold mb-3 mt-5 ${inheritTextColor ? 'text-current' : 'text-gray-900 dark:text-gray-100'}`}>
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className={`text-lg font-semibold mb-2 mt-4 ${inheritTextColor ? 'text-current' : 'text-gray-900 dark:text-gray-100'}`}>
              {children}
            </h3>
          ),
          // Paragraphs
          p: ({ children }) => (
            <p className={`mb-3 leading-relaxed ${inheritTextColor ? 'text-current' : 'text-gray-700 dark:text-gray-300'}`}>
              {children}
            </p>
          ),
          // Lists
          ul: ({ children }) => (
            <ul className={`list-disc list-inside mb-3 space-y-1 ${inheritTextColor ? 'text-current' : 'text-gray-700 dark:text-gray-300'}`}>
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className={`list-decimal list-inside mb-3 space-y-1 ${inheritTextColor ? 'text-current' : 'text-gray-700 dark:text-gray-300'}`}>
              {children}
            </ol>
          ),
          li: ({ children }) => (
            <li className="ml-2">
              {children}
            </li>
          ),
          // Bold and italic
          strong: ({ children }) => (
            <strong className={`font-bold ${inheritTextColor ? 'text-current' : 'text-gray-900 dark:text-gray-100'}`}>
              {children}
            </strong>
          ),
          em: ({ children }) => (
            <em className={`italic ${inheritTextColor ? 'text-current opacity-90' : 'text-gray-800 dark:text-gray-200'}`}>
              {children}
            </em>
          ),
          // Links
          a: ({ href, children }) => (
            <a 
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 underline"
            >
              {children}
            </a>
          ),
          // Blockquotes
          blockquote: ({ children }) => (
            <blockquote className={`border-l-4 ${inheritTextColor ? 'border-current opacity-50' : 'border-gray-300 dark:border-gray-600'} pl-4 my-3 italic ${inheritTextColor ? 'text-current opacity-80' : 'text-gray-600 dark:text-gray-400'}`}>
              {children}
            </blockquote>
          ),
          // Tables
          table: ({ children }) => (
            <div className="overflow-x-auto my-3">
              <table className="min-w-full border border-gray-300 dark:border-gray-600">
                {children}
              </table>
            </div>
          ),
          th: ({ children }) => (
            <th className="border border-gray-300 dark:border-gray-600 px-3 py-2 bg-gray-100 dark:bg-gray-800 font-semibold text-left">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="border border-gray-300 dark:border-gray-600 px-3 py-2">
              {children}
            </td>
          ),
          // Horizontal rule
          hr: () => (
            <hr className="my-6 border-gray-300 dark:border-gray-600" />
          )
        }}
      >
        {originalContent}
      </ReactMarkdown>
    </div>
  )
} 