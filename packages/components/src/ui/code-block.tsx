'use client';

import { useState } from 'react';
import { Highlight, type PrismTheme } from 'prism-react-renderer';
import { Copy, Check } from 'lucide-react';
import { cn } from '../lib/utils';
import { mode } from '@fabrk/design-system';

interface CodeBlockProps {
  code: string;
  language?: string;
  /** Max height for scrollable content (e.g., "400px", "600px") */
  maxHeight?: string;
  /** Show line numbers (default: true) */
  showLineNumbers?: boolean;
}

const cssVarTheme: PrismTheme = {
  plain: {
    color: 'oklch(var(--code-fg, var(--foreground)))',
    backgroundColor: 'oklch(var(--code-bg, var(--card)))',
  },
  styles: [
    {
      types: ['comment', 'prolog', 'doctype', 'cdata'],
      style: { color: 'var(--code-comment)', opacity: 0.7 },
    },
    { types: ['namespace'], style: { opacity: 0.7 } },
    { types: ['string', 'attr-value'], style: { color: 'var(--code-string)' } },
    { types: ['punctuation', 'operator'], style: { color: 'var(--code-punctuation)' } },
    {
      types: [
        'entity',
        'url',
        'symbol',
        'number',
        'boolean',
        'variable',
        'constant',
        'property',
        'regex',
        'inserted',
      ],
      style: { color: 'var(--code-number)' },
    },
    { types: ['atrule', 'keyword', 'attr-name'], style: { color: 'var(--code-keyword)' } },
    { types: ['function', 'deleted', 'tag'], style: { color: 'var(--code-function)' } },
    { types: ['selector'], style: { color: 'var(--code-selector)' } },
    { types: ['important', 'function', 'bold'], style: { fontWeight: 'bold' } },
    { types: ['italic'], style: { fontStyle: 'italic' } },
  ],
};

export function CodeBlock({
  code,
  language = 'typescript',
  maxHeight,
  showLineNumbers = true,
}: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code.trim());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Add $ prompt for bash/shell commands
  const isShell = language === 'bash' || language === 'sh' || language === 'shell';

  return (
    <div
      className="not-prose group relative w-full min-w-0 overflow-hidden"
      role="region"
      aria-label={`Code example in ${language}`}
    >
      <button
        onClick={handleCopy}
        className={cn(
          'absolute top-2 right-2 z-10 transition-colors',
          mode.color.text.muted,
          'hover:opacity-100'
        )}
        aria-label={copied ? 'Code copied' : 'Copy code to clipboard'}
      >
        {copied ? (
          <Check className="h-4 w-4" aria-hidden="true" />
        ) : (
          <Copy className="h-4 w-4" aria-hidden="true" />
        )}
      </button>
      {/* eslint-disable design-system/no-inline-styles -- Background must use CSS var fallback for theme preview */}
      <div
        className={cn('w-full min-w-0 overflow-hidden', mode.radius)}
        style={{ backgroundColor: 'oklch(var(--code-bg, var(--card)))' }}
      >
        {/* eslint-enable design-system/no-inline-styles */}
        <Highlight theme={cssVarTheme} code={code.trim()} language={language}>
          {({ className, style, tokens, getLineProps, getTokenProps }) => (
            <pre
              className={`${className} m-0 p-4 text-xs leading-relaxed`}
              style={{
                ...style,
                overflowY: maxHeight ? 'auto' : 'visible',
                maxWidth: '100%',
                width: '100%',
                boxSizing: 'border-box',
                ...(maxHeight && { maxHeight }),
              }}
              tabIndex={0}
            >
              {tokens.map((line, i) => (
                <div key={i} {...getLineProps({ line })} className="flex whitespace-pre-wrap">
                  {showLineNumbers && (
                    <span
                      className={cn(
                        'mr-4 inline-block w-8 flex-shrink-0 text-right select-none',
                        mode.color.text.muted
                      )}
                    >
                      {i + 1}
                    </span>
                  )}
                  <span className="flex-1">
                    {/* Add $ prompt for shell commands */}
                    {isShell && i === 0 && (
                      <span className={cn('mr-2 select-none', mode.color.text.accent)}>$</span>
                    )}
                    {isShell &&
                      i > 0 &&
                      tokens[i].length > 0 &&
                      tokens[i][0].content.trim() !== '' && (
                        <span className={cn('mr-2 select-none', mode.color.text.accent)}>$</span>
                      )}
                    {line.map((token, key) => (
                      <span key={key} {...getTokenProps({ token })} />
                    ))}
                  </span>
                </div>
              ))}
            </pre>
          )}
        </Highlight>
      </div>
    </div>
  );
}
