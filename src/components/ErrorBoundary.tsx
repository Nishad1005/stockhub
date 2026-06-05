import { Component, type ErrorInfo, type ReactNode } from "react";

/**
 * Error boundary. React error boundaries MUST be class components — this is the
 * one documented exception to the "function components only" rule (CLAUDE.md §6).
 * Without it, any thrown render/effect error unmounts the whole tree → blank page.
 */
interface Props {
  children: ReactNode;
}
interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // eslint-disable-next-line no-console
    console.error("Unhandled UI error:", error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-brand-cream text-brand-ink p-6 text-center">
          <h1 className="text-xl font-bold mb-2">Something went wrong</h1>
          <p className="text-sm text-brand-bad max-w-md mb-4 break-words">{this.state.error.message}</p>
          <button
            onClick={() => this.setState({ error: null })}
            className="rounded-lg border border-brand-line px-4 py-2 text-sm font-semibold"
          >
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
