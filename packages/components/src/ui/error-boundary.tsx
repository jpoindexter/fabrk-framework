'use client';

import React, { Component, ReactNode } from 'react';
import { Button } from './button';
import { AlertCircle } from 'lucide-react';
import { mode } from '@fabrk/design-system';
import { cn } from '@fabrk/core';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  resetKeys?: unknown[];
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.props.onError?.(error, errorInfo);
  }

  componentDidUpdate(prevProps: ErrorBoundaryProps) {
    if (this.state.hasError && this.props.resetKeys) {
      const hasChanged = this.props.resetKeys.some(
        (key, index) => key !== prevProps.resetKeys?.[index]
      );

      if (hasChanged) {
        this.setState({ hasError: false, error: undefined });
      }
    }
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex min-h-panel-sm flex-col items-center justify-center p-8 text-center">
          <AlertCircle className="text-destructive mb-4 h-12 w-12" />
          <h2 className={cn('mb-2 text-2xl font-semibold tracking-tight', mode.font)}>Something went wrong</h2>
          <p className="text-muted-foreground mb-6">
            We're sorry for the inconvenience. Please try refreshing the page.
          </p>
          {this.state.error && process.env.NODE_ENV !== 'production' && (
            <details className={cn('mb-4 max-w-2xl border p-4 text-left', mode.radius)}>
              <summary className="cursor-pointer font-semibold">Error Details</summary>
              <pre className={cn('mt-2 overflow-auto text-xs', mode.font)}>
                {this.state.error.message}
                {'\n\n'}
                {this.state.error.stack}
              </pre>
            </details>
          )}
          {this.state.error && process.env.NODE_ENV === 'production' && (
            <p className="text-muted-foreground mb-4 text-sm">An error occurred.</p>
          )}
          <Button
            onClick={() => {
              window.location.reload();
            }}
          >
            &gt; REFRESH PAGE
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Hook-based error boundary alternative
 */
export function useErrorHandler(error?: Error) {
  if (error) {
    throw error;
  }
}
