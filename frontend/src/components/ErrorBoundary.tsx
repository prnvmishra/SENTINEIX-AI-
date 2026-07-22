import { Component } from "react";
import type { ErrorInfo, ReactNode } from "react";
import { AlertTriangle } from "lucide-react";

interface ErrorBoundaryProps {
  children: ReactNode;
  fallbackTitle?: string;
}

interface ErrorBoundaryState {
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("SentinelX UI error boundary caught an error:", error, info);
  }

  handleReset = () => {
    this.setState({ error: null });
  };

  render() {
    if (this.state.error) {
      return (
        <div className="flex h-full min-h-[240px] w-full flex-col items-center justify-center gap-3 rounded-lg border border-danger/40 bg-danger/5 p-6 text-center">
          <AlertTriangle className="h-6 w-6 text-danger" />
          <p className="text-sm font-medium text-text-primary">
            {this.props.fallbackTitle ?? "This module failed to render"}
          </p>
          <p className="max-w-sm text-xs text-text-muted">{this.state.error.message}</p>
          <button
            type="button"
            onClick={this.handleReset}
            className="mt-1 rounded-md border border-border-strong px-3 py-1.5 text-xs text-text-secondary transition hover:border-primary hover:text-primary"
          >
            Retry
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
