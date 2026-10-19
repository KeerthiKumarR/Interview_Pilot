"use client";

import React, { useState } from "react";
import { Tag, Plus, X, Sparkles } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface SkillsInputProps {
  skills: string[];
  onChange: (skills: string[]) => void;
  detectedSkillsPool?: string[];
}

export function SkillsInput({
  skills,
  onChange,
  detectedSkillsPool = [],
}: SkillsInputProps) {
  const [inputValue, setInputValue] = useState("");

  const handleAddSkill = (skillToAdd?: string) => {
    const raw = skillToAdd || inputValue;
    const trimmed = raw.trim();
    if (!trimmed) return;

    // Support comma-separated batch input
    const parts = trimmed
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    const updated = [...skills];
    for (const part of parts) {
      if (!updated.some((s) => s.toLowerCase() === part.toLowerCase())) {
        updated.push(part);
      }
    }

    onChange(updated);
    if (!skillToAdd) {
      setInputValue("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      handleAddSkill();
    }
  };

  const handleRemoveSkill = (skillToRemove: string) => {
    onChange(skills.filter((s) => s !== skillToRemove));
  };

  // Find detected skills that haven't been added yet
  const unaddedDetected = detectedSkillsPool.filter(
    (ds) => !skills.some((s) => s.toLowerCase() === ds.toLowerCase())
  );

  return (
    <div className="space-y-4">
      {/* Skill Input Row */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Input
            placeholder="Type a skill and press Enter (e.g. Next.js, Redis, Docker)"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
          />
        </div>
        <Button
          type="button"
          variant="secondary"
          size="default"
          onClick={() => handleAddSkill()}
          disabled={!inputValue.trim()}
          className="gap-1.5"
        >
          <Plus className="size-4" />
          Add
        </Button>
      </div>

      {/* Active Skills Cloud */}
      <div className="min-h-12 rounded-lg border border-border bg-card/50 p-3">
        {skills.length === 0 ? (
          <p className="text-xs text-muted-foreground flex items-center gap-1.5 py-1">
            <Tag className="size-3.5" />
            No skills added yet. Type above or add from detected resume skills.
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {skills.map((skill) => (
              <Badge
                key={skill}
                variant="secondary"
                className="gap-1.5 py-1 px-2.5 text-xs font-medium border border-border"
              >
                <span>{skill}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveSkill(skill)}
                  className="rounded-full p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
                  title={`Remove ${skill}`}
                >
                  <X className="size-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}
      </div>

      {/* Suggested Unadded Skills from Resume */}
      {unaddedDetected.length > 0 && (
        <div className="space-y-2 pt-1">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Sparkles className="size-3.5 text-amber-500" />
            <span>Suggested from resume (click to add):</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {unaddedDetected.slice(0, 15).map((skill) => (
              <button
                key={skill}
                type="button"
                onClick={() => handleAddSkill(skill)}
                className="inline-flex items-center gap-1 rounded-md border border-dashed border-border bg-muted/20 px-2 py-0.5 text-xs text-muted-foreground hover:border-primary/50 hover:bg-primary/5 hover:text-foreground transition-colors cursor-pointer"
              >
                <Plus className="size-2.5" />
                {skill}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
