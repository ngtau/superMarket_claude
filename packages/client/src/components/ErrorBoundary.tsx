import { Component, type ErrorInfo, type ReactNode } from "react";
import * as Sentry from "@sentry/react";
import { Button } from "@/components/ui/button";

interface Props { children: ReactNode }
interface State { hasError: boolean }

/** §10前端工程化：全局错误边界，防止单个组件崩溃导致整页白屏，并上报Sentry */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    Sentry.captureException(error, { extra: { componentStack: errorInfo.componentStack } });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-8 text-center">
          <h2 className="text-xl font-semibold">頁面出現錯誤 / Something went wrong</h2>
          <p className="text-muted-foreground">請刷新頁面重試</p>
          <Button onClick={() => window.location.reload()}>刷新頁面</Button>
        </div>
      );
    }
    return this.props.children;
  }
}
