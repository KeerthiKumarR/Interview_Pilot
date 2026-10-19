"use client";

import { useEffect } from "react";

export function ExtensionErrorSuppressor() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    // Filter console.error from browser extensions (e.g. ImageAssistant, adblockers, etc.)
    const originalConsoleError = console.error;
    console.error = (...args: unknown[]) => {
      for (const arg of args) {
        const str =
          (arg as Error)?.stack ||
          (arg as Error)?.message ||
          (typeof arg === "string" ? arg : "");
        if (
          typeof str === "string" &&
          (str.includes("chrome-extension://") ||
            str.includes("moz-extension://") ||
            str.includes("inspector.js") ||
            str.toLowerCase().includes("speechsynthesis"))
        ) {
          return;
        }
      }
      originalConsoleError.apply(console, args);
    };

    // Catch synchronous errors thrown by extensions
    const errorHandler = (event: ErrorEvent) => {
      const filename = event.filename || "";
      const message = event.message || "";
      const stack = event.error?.stack || "";

      if (
        filename.includes("chrome-extension://") ||
        filename.includes("moz-extension://") ||
        message.includes("chrome-extension://") ||
        stack.includes("chrome-extension://") ||
        stack.includes("inspector.js")
      ) {
        event.stopImmediatePropagation();
        event.preventDefault();
      }
    };

    // Catch unhandled promise/fetch rejections from extensions
    const rejectionHandler = (event: PromiseRejectionEvent) => {
      const reasonStr = event.reason?.toString() || "";
      const stack = event.reason?.stack || "";

      if (
        reasonStr.includes("chrome-extension://") ||
        reasonStr.includes("moz-extension://") ||
        stack.includes("chrome-extension://") ||
        stack.includes("inspector.js")
      ) {
        event.stopImmediatePropagation();
        event.preventDefault();
      }
    };

    window.addEventListener("error", errorHandler, true);
    window.addEventListener("unhandledrejection", rejectionHandler, true);

    return () => {
      console.error = originalConsoleError;
      window.removeEventListener("error", errorHandler, true);
      window.removeEventListener("unhandledrejection", rejectionHandler, true);
    };
  }, []);

  return null;
}
