"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Database,
  Users,
  MessageSquare,
  Layers,
  ShieldAlert,
  Briefcase,
  Sparkles,
  PanelLeft,
  ArrowLeft,
  FileCode2,
  GraduationCap,
} from "lucide-react";
import { MiraiLogo } from "@/components/mirai-logo";
import { useCachedData } from "@/lib/client-cache";

export function Sidebar() {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { data: roleData } = useCachedData<{ role: string; isAdmin: boolean; isStaff: boolean }>("/api/admin/role");
  const isSuperAdmin = roleData ? roleData.isAdmin : true;

  useEffect(() => {
    try {
      const saved = localStorage.getItem("admin_sidebar_collapsed");
      if (saved !== null) {
        setIsCollapsed(saved === "true");
      }
    } catch {}
  }, []);

  const toggleCollapsed = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("admin_sidebar_collapsed", String(next));
      } catch {}
      return next;
    });
  };

  const links = [
    { name: "Users & Roles", href: "/admin", icon: Users, adminOnly: true },
    { name: "Campus Job Drives", href: "/admin/jobs", icon: GraduationCap },
    { name: "Interview Roles", href: "/admin/roles", icon: Briefcase, adminOnly: true },
    { name: "Skills Manager", href: "/admin/skills", icon: Sparkles, adminOnly: true },
    { name: "Interview & Category Studio", href: "/admin/voice-studio", icon: Layers, adminOnly: true },
    { name: "Upload Questions", href: "/admin/upload-questions", icon: FileCode2, adminOnly: true },
    { name: "Database Logs", href: "/admin/database", icon: Database, adminOnly: true },
    { name: "User Feedbacks", href: "/admin/feedback", icon: MessageSquare },
    { name: "Cheaters", href: "/admin/cheaters", icon: ShieldAlert },
  ];

  const visibleLinks = roleData && !roleData.isAdmin
    ? links.filter((l) => !l.adminOnly)
    : links;

  return (
    <>
      <div
        className={`${
          isCollapsed ? "w-16" : "w-64"
        } border-r border-border bg-card flex flex-col h-full shrink-0 transition-[width] duration-300 ease-in-out`}
      >
        {/* Header */}
        {isCollapsed ? (
          <div className="p-3 border-b border-border flex flex-col items-center gap-2.5">
            <button
              type="button"
              onClick={toggleCollapsed}
              className="p-2 rounded-lg bg-card border border-border hover:bg-secondary text-foreground transition-colors cursor-pointer"
              title="Expand sidebar"
              aria-label="Expand sidebar"
            >
              <PanelLeft className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="p-4 border-b border-border flex items-center justify-between gap-2">
            <Link
              href="/dashboard"
              className="flex items-center gap-2 hover:opacity-85 transition-opacity truncate"
            >
              <MiraiLogo size={24} />
              <span className="text-base font-bold tracking-tight text-foreground truncate">
                Mirai<span className="text-primary font-semibold">{roleData && !roleData.isAdmin ? ".Staff" : ".Admin"}</span>
              </span>
            </Link>
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={toggleCollapsed}
                className="p-2 rounded-lg bg-card border border-border hover:bg-secondary text-foreground transition-colors cursor-pointer"
                title="Collapse sidebar"
                aria-label="Collapse sidebar"
              >
                <PanelLeft className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Navigation */}
        <nav className={`flex-1 ${isCollapsed ? "p-2 space-y-2" : "p-4 space-y-1.5"} overflow-y-auto`}>
          {visibleLinks.map((link) => {
            const Icon = link.icon;
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center ${
                  isCollapsed ? "justify-center p-2.5" : "gap-3 px-3 py-2"
                } rounded-lg text-xs transition-colors relative group ${
                  isActive
                    ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground font-medium"
                }`}
                title={isCollapsed ? link.name : undefined}
              >
                <Icon className="w-4 h-4 shrink-0" />
                {!isCollapsed && <span className="truncate">{link.name}</span>}

                {/* Floating tooltip when collapsed */}
                {isCollapsed && (
                  <div className="absolute left-full ml-2 px-2.5 py-1 bg-popover text-popover-foreground text-[11px] font-medium rounded-md shadow-md border border-border whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50">
                    {link.name}
                  </div>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        {isCollapsed ? (
          <div className="p-2 border-t border-border flex flex-col items-center gap-2 bg-card">
            <Link
              href="/dashboard"
              className="p-2 rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors relative group"
              title="Back to Dashboard"
            >
              <ArrowLeft className="w-4 h-4 shrink-0" />
              <div className="absolute left-full ml-2 px-2.5 py-1 bg-popover text-popover-foreground text-[11px] font-medium rounded-md shadow-md border border-border whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50">
                Dashboard
              </div>
            </Link>
          </div>
        ) : (
          <div className="p-4 border-t border-border flex items-center justify-between gap-2 bg-card">
            <Link
              href="/dashboard"
              className="text-xs text-muted-foreground hover:text-foreground hover:underline flex items-center gap-1.5"
            >
              <ArrowLeft className="w-3.5 h-3.5 shrink-0" />
              <span>Back to Dashboard</span>
            </Link>
          </div>
        )}
      </div>
    </>
  );
}
