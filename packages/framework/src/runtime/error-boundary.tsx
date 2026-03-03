import React from "react";

export const FABRK_NOT_FOUND = "FABRK_NOT_FOUND";
export const FABRK_REDIRECT = "FABRK_REDIRECT";

export interface FabrkError extends Error {
  digest?: string;
  /** For redirects: the target URL. */
  url?: string;
  /** For redirects: the status code (301, 302, 307, 308). */
  statusCode?: number;
}

/**
 * Check if an error is a fabrk-specific digest error (not-found, redirect).
 * These should not be treated as unexpected errors — they control flow.
 */
export function isDigestError(error: unknown): error is FabrkError {
  if (!(error instanceof Error)) return false;
  const digest = (error as FabrkError).digest;
  return digest === FABRK_NOT_FOUND || digest === FABRK_REDIRECT;
}

export interface ErrorBoundaryProps {
  /** The error.tsx fallback component. Receives { error, reset }. */
  fallback?: React.ComponentType<{
    error: Error & { digest?: string };
    reset: () => void;
  }>;
  /** Current pathname — reset error state on navigation. */
  pathname?: string;
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  error: (Error & { digest?: string }) | null;
  pathname?: string;
}

export class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { error: null, pathname: props.pathname };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    // Don't catch not-found or redirect errors — let them bubble
    if (isDigestError(error)) throw error;
    return { error };
  }

  static getDerivedStateFromProps(
    props: ErrorBoundaryProps,
    state: ErrorBoundaryState
  ): Partial<ErrorBoundaryState> | null {
    // Reset error when pathname changes (SPA navigation recovery)
    if (props.pathname !== state.pathname) {
      return { error: null, pathname: props.pathname };
    }
    return null;
  }

  reset = (): void => {
    this.setState({ error: null });
  };

  render(): React.ReactNode {
    const { error } = this.state;
    const { fallback: Fallback, children } = this.props;

    if (error) {
      if (Fallback) {
        return React.createElement(Fallback, {
          error,
          reset: this.reset,
        });
      }
      return React.createElement(
        "div",
        { style: { padding: "2rem", fontFamily: "monospace" } },
        React.createElement("h2", null, "Something went wrong"),
        React.createElement(
          "pre",
          { style: { color: "#e53e3e", whiteSpace: "pre-wrap" } },
          error.message
        ),
        React.createElement(
          "button",
          {
            onClick: this.reset,
            style: {
              marginTop: "1rem",
              padding: "0.5rem 1rem",
              cursor: "pointer",
            },
          },
          "Try again"
        )
      );
    }

    return children;
  }
}

export interface NotFoundBoundaryProps {
  /** The not-found.tsx fallback component. */
  fallback?: React.ComponentType;
  /** Current pathname — reset on navigation. */
  pathname?: string;
  children: React.ReactNode;
}

interface NotFoundBoundaryState {
  notFound: boolean;
  pathname?: string;
}

export class NotFoundBoundary extends React.Component<
  NotFoundBoundaryProps,
  NotFoundBoundaryState
> {
  constructor(props: NotFoundBoundaryProps) {
    super(props);
    this.state = { notFound: false, pathname: props.pathname };
  }

  static getDerivedStateFromError(
    error: Error
  ): Partial<NotFoundBoundaryState> | null {
    if ((error as FabrkError).digest === FABRK_NOT_FOUND) {
      return { notFound: true };
    }
    throw error;
  }

  static getDerivedStateFromProps(
    props: NotFoundBoundaryProps,
    state: NotFoundBoundaryState
  ): Partial<NotFoundBoundaryState> | null {
    if (props.pathname !== state.pathname) {
      return { notFound: false, pathname: props.pathname };
    }
    return null;
  }

  render(): React.ReactNode {
    const { notFound } = this.state;
    const { fallback: Fallback, children } = this.props;

    if (notFound) {
      if (Fallback) {
        return React.createElement(Fallback);
      }
      return React.createElement(
        "div",
        { style: { padding: "2rem", fontFamily: "monospace" } },
        React.createElement("h2", null, "404 — Not Found"),
        React.createElement("p", null, "This page could not be found.")
      );
    }

    return children;
  }
}

export interface GlobalErrorBoundaryProps {
  fallback?: React.ComponentType<{
    error: Error & { digest?: string };
    reset: () => void;
  }>;
  children: React.ReactNode;
}

interface GlobalErrorBoundaryState {
  error: (Error & { digest?: string }) | null;
}

/**
 * Outermost boundary wrapping the root layout.
 * Renders global-error.tsx or a minimal HTML shell on catastrophic failure.
 */
export class GlobalErrorBoundary extends React.Component<
  GlobalErrorBoundaryProps,
  GlobalErrorBoundaryState
> {
  constructor(props: GlobalErrorBoundaryProps) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(
    error: Error
  ): Partial<GlobalErrorBoundaryState> {
    // Let redirects through — they're handled by the server
    if ((error as FabrkError).digest === FABRK_REDIRECT) throw error;
    return { error };
  }

  reset = (): void => {
    this.setState({ error: null });
  };

  render(): React.ReactNode {
    const { error } = this.state;
    const { fallback: Fallback, children } = this.props;

    if (error) {
      if (Fallback) {
        return React.createElement(Fallback, {
          error,
          reset: this.reset,
        });
      }
      return React.createElement(
        "html",
        { lang: "en" },
        React.createElement(
          "body",
          { style: { padding: "2rem", fontFamily: "monospace" } },
          React.createElement("h1", null, "Application Error"),
          React.createElement(
            "pre",
            { style: { color: "#e53e3e", whiteSpace: "pre-wrap" } },
            error.message
          ),
          React.createElement(
            "button",
            { onClick: this.reset, style: { cursor: "pointer" } },
            "Reload"
          )
        )
      );
    }

    return children;
  }
}
