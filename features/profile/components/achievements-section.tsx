"use client";

import React from "react";
import { Trophy, Award, Calendar, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StudentAchievementData } from "@/types/profile";

interface AchievementsSectionProps {
  achievements: StudentAchievementData[];
  onChange: (achievements: StudentAchievementData[]) => void;
}

export function AchievementsSection({
  achievements,
  onChange,
}: AchievementsSectionProps) {
  const handleAddAchievement = () => {
    const newAch: StudentAchievementData = {
      title: "",
      category: "hackathon",
      description: "",
      date: "",
    };
    onChange([...achievements, newAch]);
  };

  const handleUpdate = (
    index: number,
    field: keyof StudentAchievementData,
    value: string
  ) => {
    const updated = [...achievements];
    updated[index] = {
      ...updated[index],
      [field]: value,
    };
    onChange(updated);
  };

  const handleRemove = (index: number) => {
    onChange(achievements.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-sm font-semibold flex items-center gap-2">
            <Trophy className="size-4 text-amber-500" />
            Achievements & Certifications ({achievements.length})
          </h4>
          <p className="text-xs text-muted-foreground mt-0.5">
            Hackathons, industry certs, competitive programming awards, leadership
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleAddAchievement}
          className="gap-1.5"
        >
          <Plus className="size-3.5" />
          Add Item
        </Button>
      </div>

      {achievements.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-6 text-center bg-card/30">
          <Award className="size-8 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm font-medium">No achievements added yet</p>
          <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
            Highlight hackathons, AWS/Google Cloud certs, or student clubs to give interviewers extra talking points.
          </p>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={handleAddAchievement}
            className="mt-3 gap-1.5"
          >
            <Plus className="size-3.5" />
            Add First Achievement
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {achievements.map((item, idx) => (
            <div
              key={idx}
              className="rounded-xl border border-border bg-card p-4 space-y-3 shadow-xs"
            >
              <div className="flex items-center justify-between border-b border-border/60 pb-2.5">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Item #{idx + 1}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  onClick={() => handleRemove(idx)}
                  className="text-muted-foreground hover:text-destructive"
                  title="Remove this item"
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                {/* Title */}
                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-xs font-medium text-foreground">
                    Title <span className="text-destructive">*</span>
                  </label>
                  <Input
                    placeholder="e.g. 1st Place - Smart India Hackathon"
                    value={item.title}
                    onChange={(e) => handleUpdate(idx, "title", e.target.value)}
                  />
                </div>

                {/* Category */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground">
                    Category
                  </label>
                  <select
                    value={item.category}
                    onChange={(e) =>
                      handleUpdate(
                        idx,
                        "category",
                        e.target.value as StudentAchievementData["category"]
                      )
                    }
                    className="flex h-9 w-full rounded-lg border border-input bg-background px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    <option value="hackathon">Hackathon</option>
                    <option value="certification">Certification</option>
                    <option value="award">Award / Contest</option>
                    <option value="club">Tech Club / Lead</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                {/* Date */}
                <div className="space-y-1.5 sm:col-span-1">
                  <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                    <Calendar className="size-3.5 text-foreground" />
                    Date / Year
                  </label>
                  <Input
                    placeholder="e.g. 2025 or Aug 2024"
                    value={item.date || ""}
                    onChange={(e) => handleUpdate(idx, "date", e.target.value)}
                  />
                </div>

                {/* Description */}
                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-xs font-medium text-muted-foreground">
                    Brief Notes
                  </label>
                  <Input
                    placeholder="e.g. Built decentralized verification oracle in 36h sprint"
                    value={item.description || ""}
                    onChange={(e) =>
                      handleUpdate(idx, "description", e.target.value)
                    }
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
