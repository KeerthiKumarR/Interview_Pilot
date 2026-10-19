"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import {
  CheckCircle2,
  AlertCircle,
  Info,
  X,
} from "lucide-react";

interface ToastItem {
  id: string;
  type: "success" | "error" | "info";
  title: string;
  message: string;
}

interface NotificationContextType {
  notify: (
    type: "success" | "error" | "info",
    title: string,
    message: string,
    action?: string
  ) => void;
  openDrawer: () => void;
  unreadCount: number;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function useAdminNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error("useAdminNotifications must be used within AdminNotificationProvider");
  }
  return context;
}

export function AdminNotificationProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const notify = useCallback(
    (type: "success" | "error" | "info", title: string, message: string) => {
      const toastId = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

      // Add active floating pop-up toast
      setToasts((prev) => [...prev, { id: toastId, type, title, message }]);

      // Auto-remove toast after 4 seconds
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== toastId));
      }, 4000);
    },
    []
  );

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const openDrawer = () => {
    // No-op: Drawer removed per user request
  };

  return (
    <NotificationContext.Provider value={{ notify, openDrawer, unreadCount: 0 }}>
      {children}

      {/* Floating Dark Pop-up Toasts (Bottom-Right) */}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none">
        {toasts.map((toast) => {
          const isSuccess = toast.type === "success";
          const isError = toast.type === "error";

          return (
            <div
              key={toast.id}
              className="pointer-events-auto flex items-start gap-3 p-3.5 rounded-xl border border-zinc-800 bg-zinc-950/95 text-zinc-100 shadow-2xl backdrop-blur-md transition-all duration-300 animate-in fade-in slide-in-from-bottom-3"
            >
              {/* Type SVG Icon */}
              <div
                className={`p-1.5 rounded-lg flex-shrink-0 mt-0.5 ${
                  isSuccess
                    ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                    : isError
                    ? "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                    : "bg-sky-500/10 text-sky-400 border border-sky-500/20"
                }`}
              >
                {isSuccess ? (
                  <CheckCircle2 className="w-4 h-4" />
                ) : isError ? (
                  <AlertCircle className="w-4 h-4" />
                ) : (
                  <Info className="w-4 h-4" />
                )}
              </div>

              {/* Text Body */}
              <div className="flex-1 min-w-0 pr-1">
                <h4 className="text-xs font-semibold text-zinc-100 tracking-tight">
                  {toast.title}
                </h4>
                <p className="text-[11px] text-zinc-400 mt-0.5 leading-relaxed break-words">
                  {toast.message}
                </p>
              </div>

              {/* Close Button */}
              <button
                onClick={() => removeToast(toast.id)}
                className="text-zinc-500 hover:text-zinc-300 transition-colors p-1"
                aria-label="Close notification"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </NotificationContext.Provider>
  );
}

/**
 * Stub AdminNotificationBell for backwards compatibility
 */
export function AdminNotificationBell() {
  return null;
}
