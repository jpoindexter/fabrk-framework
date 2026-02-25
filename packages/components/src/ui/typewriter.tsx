'use client';

import { useEffect, useRef, useState } from 'react';
import { mode } from '@fabrk/design-system';
import { cn } from '@fabrk/core';

interface TypeWriterProps {
  text: string;
  delay?: number;
  speed?: number;
  showCursor?: boolean;
  cursorAtEnd?: boolean;
}

/**
 * TypeWriter Component
 * Animated typewriter effect that triggers on scroll
 * Uses CSS animations instead of Framer Motion for performance
 */
export function TypeWriter({
  text,
  delay = 0,
  speed = 30,
  showCursor = false,
  cursorAtEnd = false,
}: TypeWriterProps) {
  const [displayText, setDisplayText] = useState('');
  const [started, setStarted] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  // Intersection Observer for scroll trigger
  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!isInView) return;

    const startTimer = setTimeout(() => {
      setStarted(true);
    }, delay * 1000);

    return () => clearTimeout(startTimer);
  }, [isInView, delay]);

  useEffect(() => {
    if (!started) return;

    let index = 0;
    const timer = setInterval(() => {
      if (index <= text.length) {
        setDisplayText(text.slice(0, index));
        index++;
      } else {
        clearInterval(timer);
      }
    }, speed);

    return () => clearInterval(timer);
  }, [started, text, speed]);

  const shouldShowCursor = showCursor && (cursorAtEnd || displayText.length < text.length);

  return (
    <span ref={ref}>
      {displayText}
      {shouldShowCursor && (
        <span
          className={cn('inline-block w-cursor animate-blink', mode.color.text.accent)}
        >
          █
        </span>
      )}
    </span>
  );
}
