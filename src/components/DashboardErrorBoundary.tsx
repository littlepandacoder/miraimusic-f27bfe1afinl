import { Component, ReactNode } from "react";
import { Button } from "@/components/ui/button";

interface Props {
  children: ReactNode;
  label?: string;
}

interface State {
  error: Error | null;
}

export class DashboardErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    console.error("[DashboardErrorBoundary] caught render error:", error.message, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
          <div className="max-w-lg w-full space-y-4 text-center">
            <h2 className="text-xl font-bold text-destructive">Dashboard failed to load</h2>
            <p className="text-sm text-muted-foreground font-mono bg-muted p-3 rounded text-left break-all whitespace-pre-wrap">
              {this.state.error.message}
            </p>
            <p className="text-xs text-muted-foreground">
              Check the browser console for the full stack trace.
            </p>
            <Button onClick={() => window.location.reload()}>Reload Page</Button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
