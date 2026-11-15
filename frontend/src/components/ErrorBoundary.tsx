import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  fallbackMessage?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error caught by ErrorBoundary:", error, errorInfo);
    this.setState({ error, errorInfo });
  }

  public handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="mx-auto max-w-3xl px-4 py-12">
          <div className="rounded-2xl border-2 border-amber-200 bg-white p-6 shadow-soft sm:p-8">
            <div className="flex items-start gap-4">
              <div className="rounded-xl bg-amber-100 p-3 text-amber-800 shrink-0">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <div className="space-y-2 flex-1">
                <h2 className="text-xl font-extrabold text-forest-deep">
                  {this.props.fallbackTitle || "Something went wrong loading this component"}
                </h2>
                <p className="text-sm text-navy/75 leading-relaxed">
                  {this.props.fallbackMessage ||
                    "An unexpected error occurred while rendering this view. You can reload the component or return to the dashboard."}
                </p>
                {this.state.error?.message && (
                  <div className="mt-3 rounded-lg bg-sage-50 border border-sage-200 p-3 font-mono text-xs text-red-800 break-words">
                    {this.state.error.message}
                  </div>
                )}
                <div className="mt-5 flex flex-wrap items-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={this.handleReset}
                    className="btn btn-primary text-xs font-bold flex items-center gap-1.5"
                  >
                    <RefreshCw className="h-4 w-4" />
                    <span>Try Again</span>
                  </button>
                  <a
                    href="/app"
                    className="btn btn-ghost text-xs font-bold border border-sage-300 flex items-center gap-1.5"
                  >
                    <Home className="h-4 w-4" />
                    <span>Back to Dashboard</span>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
