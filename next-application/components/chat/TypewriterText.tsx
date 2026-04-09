'use client'

import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import MarkdownRenderer from './MarkdownRenderer'

interface TypewriterTextProps {
  text: string
  speed?: number
  className?: string
  onComplete?: () => void
  shouldStop?: boolean
  onStop?: () => void
  inheritTextColor?: boolean
}

export default function TypewriterText({ 
  text, 
  speed = 30, 
  className = '',
  onComplete,
  shouldStop = false,
  onStop,
  inheritTextColor = false
}: TypewriterTextProps) {
  const [displayedText, setDisplayedText] = useState('')
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isStopped, setIsStopped] = useState(false)

  useEffect(() => {
    if (shouldStop && !isStopped) {
      setIsStopped(true)
      setDisplayedText(text) // Show full text immediately when stopped
      setCurrentIndex(text.length)
      if (onStop) {
        onStop()
      }
      return
    }

    if (!isStopped && currentIndex < text.length) {
      const timer = setTimeout(() => {
        setDisplayedText(text.slice(0, currentIndex + 1))
        setCurrentIndex(currentIndex + 1)
      }, speed)

      return () => clearTimeout(timer)
    } else if (!isStopped && currentIndex >= text.length && onComplete) {
      onComplete()
    }
  }, [currentIndex, text, speed, onComplete, shouldStop, isStopped, onStop])

  // Reset when text changes
  useEffect(() => {
    setDisplayedText('')
    setCurrentIndex(0)
    setIsStopped(false)
  }, [text])

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <div className="inline-block">
        <MarkdownRenderer 
          content={displayedText} 
          className="text-sm leading-relaxed"
          inheritTextColor={inheritTextColor}
        />
        {currentIndex < text.length && !isStopped && (
          <motion.span
            className="inline-block w-[2px] h-[1em] bg-current ml-1 align-bottom"
            animate={{ opacity: [1, 0] }}
            transition={{
              duration: 0.8,
              repeat: Infinity,
              ease: "linear"
            }}
          />
        )}
      </div>
    </motion.div>
  )
} 