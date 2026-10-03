import { Component, type ErrorInfo, type ReactNode } from "react";
import type { PlatformAPI } from "@glass-dock/platform";

interface Props {
  platform: PlatformAPI;
  children: ReactNode;
}

/**
 * Last line of defense: if the UI throws, show a small recovery bar instead of a blank window.
 * It can bring the Windows taskbar back (in case it was hidden) and reload the dock.
 */
export class ErrorBoundary extends Component<Props, { error: Error | null }> {
  override state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  override componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Dock UI crashed:", error, info.componentStack);
    // Never leave the user without a taskbar because the UI died.
    void this.props.platform.setTaskbarHidden(false).catch(() => {});
  }

  override render() {
    if (!this.state.error) return this.props.children;
    const btn = "rounded-lg bg-white/20 px-3 py-1 text-sm hover:bg-white/30";
    return (
      <div role="alert" className="flex h-full w-full items-center justify-center p-2">
        <div className="flex items-center gap-3 rounded-2xl bg-neutral-900/90 px-4 py-2 text-sm text-white">
          <span>Glass Dock hit a problem: {this.state.error.message.slice(0, 80)}</span>
          <button className={btn} onClick={() => location.reload()}>
            Reload dock
          </button>
        </div>
      </div>
    );
  }
}
