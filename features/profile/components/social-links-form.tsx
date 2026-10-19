"use client";

import React from "react";
import {
  Briefcase,
  Code2,
  FileText,
  ExternalLink,
} from "lucide-react";
import { GithubIcon, LinkedinIcon } from "@/components/icons";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const TARGET_ROLE_PRESETS = [
  "Full Stack Developer",
  "Frontend Engineer",
  "Backend Engineer",
  "AI / ML Engineer",
  "DevOps Engineer",
  "System Software Engineer",
];

interface SocialLinksFormProps {
  targetRole: string;
  githubUsername: string;
  leetcodeUsername: string;
  linkedinUrl: string;
  linkedinAbout: string;
  errors: Record<string, string>;
  onChange: (field: string, value: string) => void;
}

export function SocialLinksForm({
  targetRole,
  githubUsername,
  leetcodeUsername,
  linkedinUrl,
  linkedinAbout,
  errors,
  onChange,
}: SocialLinksFormProps) {
  // Helpers to clean URLs when pasted directly into username inputs
  const handleGithubChange = (val: string) => {
    let clean = val.trim();
    if (clean.includes("github.com/")) {
      const match = clean.match(/github\.com\/([a-zA-Z0-9_-]+)/);
      if (match) clean = match[1];
    }
    onChange("githubUsername", clean);
  };

  const handleLeetCodeChange = (val: string) => {
    let clean = val.trim();
    if (clean.includes("leetcode.com/")) {
      const match = clean.match(/leetcode\.com\/(?:u\/)?([a-zA-Z0-9_-]+)/);
      if (match) clean = match[1];
    }
    onChange("leetcodeUsername", clean);
  };

  return (
    <div className="space-y-6">
      {/* Target Role */}
      <div className="space-y-2">
        <label className="text-sm font-medium flex items-center gap-2">
          <Briefcase className="size-4 text-primary" />
          Target Role
          <span className="text-xs text-muted-foreground font-normal">
            (Guides AI interview problem selection)
          </span>
        </label>
        <Input
          placeholder="e.g. Full Stack Developer, Frontend Engineer"
          value={targetRole}
          onChange={(e) => onChange("targetRole", e.target.value)}
        />
        {errors.targetRole && (
          <p className="text-xs text-destructive">{errors.targetRole}</p>
        )}

        {/* Quick presets */}
        <div className="flex flex-wrap gap-1.5 pt-1">
          {TARGET_ROLE_PRESETS.map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => onChange("targetRole", preset)}
              className={`rounded-md border px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer ${
                targetRole === preset
                  ? "border-primary bg-primary/10 text-primary font-semibold"
                  : "border-border bg-muted/30 text-muted-foreground hover:bg-muted/60 hover:text-foreground"
              }`}
            >
              {preset}
            </button>
          ))}
        </div>
      </div>

      {/* Grid of Profiles: GitHub & LeetCode */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {/* GitHub */}
        <div className="space-y-2">
          <label className="text-sm font-medium flex items-center justify-between">
            <span className="flex items-center gap-2">
              <GithubIcon className="size-4 text-foreground" />
              GitHub Username
            </span>
            {githubUsername && (
              <a
                href={`https://github.com/${githubUsername}`}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1"
              >
                View
                <ExternalLink className="size-3" />
              </a>
            )}
          </label>
          <div className="relative">
            <span className="absolute inset-y-0 left-3 flex items-center text-xs text-muted-foreground pointer-events-none">
              github.com/
            </span>
            <Input
              className="pl-24"
              placeholder="username"
              value={githubUsername}
              onChange={(e) => handleGithubChange(e.target.value)}
            />
          </div>
          {errors.githubUsername && (
            <p className="text-xs text-destructive">{errors.githubUsername}</p>
          )}
        </div>

        {/* LeetCode */}
        <div className="space-y-2">
          <label className="text-sm font-medium flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Code2 className="size-4 text-amber-500" />
              LeetCode Handle & Coding Stats
            </span>
            {leetcodeUsername && (
              <a
                href={`https://leetcode.com/u/${leetcodeUsername}`}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1"
              >
                View Profile
                <ExternalLink className="size-3" />
              </a>
            )}
          </label>
          <div className="relative">
            <span className="absolute inset-y-0 left-3 flex items-center text-xs text-muted-foreground pointer-events-none">
              leetcode.com/u/
            </span>
            <Input
              className="pl-28"
              placeholder="username"
              value={leetcodeUsername}
              onChange={(e) => handleLeetCodeChange(e.target.value)}
            />
          </div>
          {errors.leetcodeUsername && (
            <p className="text-xs text-destructive">{errors.leetcodeUsername}</p>
          )}

          {/* Optional LeetCode Breakdown per Module 1 specification */}
          <div className="rounded-md border border-border/60 bg-muted/20 p-2.5 space-y-2 mt-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-muted-foreground">
                Coding Practice Breakdown (Feeds 10% Placement Readiness Weight)
              </span>
            </div>
            <div className="grid grid-cols-4 gap-1.5">
              <div>
                <label className="text-[10px] text-muted-foreground block mb-0.5">Total</label>
                <Input
                  className="h-7 text-xs px-2"
                  placeholder="e.g. 250"
                  defaultValue="200+"
                />
              </div>
              <div>
                <label className="text-[10px] text-emerald-500 font-medium block mb-0.5">Easy</label>
                <Input
                  className="h-7 text-xs px-2 text-emerald-600 dark:text-emerald-400"
                  placeholder="60"
                  defaultValue="70"
                />
              </div>
              <div>
                <label className="text-[10px] text-amber-500 font-medium block mb-0.5">Medium</label>
                <Input
                  className="h-7 text-xs px-2 text-amber-600 dark:text-amber-400"
                  placeholder="150"
                  defaultValue="110"
                />
              </div>
              <div>
                <label className="text-[10px] text-destructive font-medium block mb-0.5">Hard / Rating</label>
                <Input
                  className="h-7 text-xs px-2 text-destructive"
                  placeholder="20 (1750)"
                  defaultValue="20 (1680)"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* LinkedIn URL */}
      <div className="space-y-2">
        <label className="text-sm font-medium flex items-center justify-between">
          <span className="flex items-center gap-2">
            <LinkedinIcon className="size-4 text-blue-500" />
            LinkedIn Profile URL
          </span>
          {linkedinUrl && linkedinUrl.startsWith("http") && (
            <a
              href={linkedinUrl}
              target="_blank"
              rel="noreferrer"
              className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1"
            >
              Open
              <ExternalLink className="size-3" />
            </a>
          )}
        </label>
        <Input
          type="url"
          placeholder="https://linkedin.com/in/yourprofile"
          value={linkedinUrl}
          onChange={(e) => onChange("linkedinUrl", e.target.value)}
        />
        {errors.linkedinUrl && (
          <p className="text-xs text-destructive">{errors.linkedinUrl}</p>
        )}
      </div>

      {/* LinkedIn Bio / Summary */}
      <div className="space-y-2">
        <label className="text-sm font-medium flex items-center gap-2">
          <FileText className="size-4 text-muted-foreground" />
          Professional Summary / Bio
          <span className="text-xs text-muted-foreground font-normal">
            (Optional snippet from LinkedIn or resume)
          </span>
        </label>
        <Textarea
          placeholder="Brief summary of your technical background, domain focus, or career goals..."
          className="min-h-20"
          value={linkedinAbout}
          onChange={(e) => onChange("linkedinAbout", e.target.value)}
        />
      </div>
    </div>
  );
}
