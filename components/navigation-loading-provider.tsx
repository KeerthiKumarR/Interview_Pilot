"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  Suspense,
} from "react";
import { usePathname, useSearchParams } from "next/navigation";

interface NavigationContextType {
  isNavigating: boolean;
  navigatingTarget: string | null;
  startNavigation: (target?: string) => void;
  stopNavigation: () => void;
}

const NavigationContext = createContext<NavigationContextType>({
  isNavigating: false,
  navigatingTarget: null,
  startNavigation: () => {},
  stopNavigation: () => {},
});

export function useNavigationLoading() {
  return useContext(NavigationContext);
}

function NavigationEvents({ onReset }: { onReset: () => void }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    onReset();
  }, [pathname, searchParams, onReset]);

  return null;
}

export function NavigationLoadingProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isNavigating, setIsNavigating] = useState(false);
  const [navigatingTarget, setNavigatingTarget] = useState<string | null>(null);
  const pathname = usePathname();
  const safetyTimerRef = useRef<NodeJS.Timeout | null>(null);

  const stopNavigation = useCallback(() => {
    setIsNavigating(false);
    setNavigatingTarget(null);
    if (safetyTimerRef.current) {
      clearTimeout(safetyTimerRef.current);
      safetyTimerRef.current = null;
    }
  }, []);

  const startNavigation = useCallback((target?: string) => {
    setIsNavigating(true);
    if (target) setNavigatingTarget(target);

    // Fast safety timeout: resets in 1200ms max so user is NEVER blocked
    if (safetyTimerRef.current) clearTimeout(safetyTimerRef.current);
    safetyTimerRef.current = setTimeout(() => {
      setIsNavigating(false);
      setNavigatingTarget(null);
    }, 1200);
  }, []);

  // When pathname changes, navigation is complete!
  useEffect(() => {
    stopNavigation();
  }, [pathname, stopNavigation]);

  // Intercept all internal <a> and <Link> clicks globally
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = (e.target as HTMLElement).closest("a");
      if (!target) return;

      const href = target.getAttribute("href");
      if (!href) return;

      // Ignore external links, downloads, new tabs, and hash anchors
      if (
        href.startsWith("http://") ||
        href.startsWith("https://") ||
        href.startsWith("//") ||
        href.startsWith("#") ||
        href.startsWith("mailto:") ||
        href.startsWith("tel:") ||
        target.getAttribute("target") === "_blank" ||
        target.hasAttribute("download") ||
        e.ctrlKey ||
        e.metaKey ||
        e.shiftKey ||
        e.altKey
      ) {
        return;
      }

      try {
        const targetUrl = new URL(href, window.location.origin);
        const currentUrl = new URL(window.location.href);

        // Only trigger loading bar if navigating to a different pathname
        const isDifferentPath = targetUrl.pathname !== currentUrl.pathname;

        if (isDifferentPath) {
          startNavigation(targetUrl.pathname);
        }
      } catch {
        // Ignore invalid URLs
      }
    };

    document.addEventListener("click", handleClick, { capture: true });
    return () => {
      document.removeEventListener("click", handleClick, { capture: true });
      if (safetyTimerRef.current) clearTimeout(safetyTimerRef.current);
    };
  }, [startNavigation]);

  return (
    <NavigationContext.Provider
      value={{
        isNavigating,
        navigatingTarget,
        startNavigation,
        stopNavigation,
      }}
    >
      <Suspense fallback={null}>
        <NavigationEvents onReset={stopNavigation} />
      </Suspense>

      {/* Sleek, Non-Blocking Top Progress Bar (Linear/GitHub/YouTube style) */}
      {isNavigating && (
        <div
          className="fixed top-0 left-0 right-0 z-[10001] h-0.5 overflow-hidden pointer-events-none"
          role="progressbar"
          aria-label="Loading page"
        >
          <div className="h-full bg-gradient-to-r from-emerald-500 via-primary to-cyan-400 animate-indeterminate origin-left shadow-[0_0_8px_rgba(16,185,129,0.7)]" />
        </div>
      )}

      {/* Main content: Always crisp, always clickable, never dimmed */}
      <div className="min-h-full">
        {children}
      </div>
    </NavigationContext.Provider>
  );
}
