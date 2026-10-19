"use client";

import React from "react";
import {
  FolderGit2,
  ExternalLink,
  Plus,
  Trash2,
  Layers,
  FileCode2,
} from "lucide-react";
import { GithubIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { StudentProjectData } from "@/types/profile";

interface ProjectsSectionProps {
  projects: StudentProjectData[];
  onChange: (projects: StudentProjectData[]) => void;
}

export function ProjectsSection({ projects, onChange }: ProjectsSectionProps) {
  const handleAddProject = () => {
    const newProj: StudentProjectData = {
      title: "",
      description: "",
      repoUrl: "",
      liveUrl: "",
      techStack: [],
      order: projects.length + 1,
    };
    onChange([...projects, newProj]);
  };

  const handleUpdateProject = (
    index: number,
    field: keyof StudentProjectData,
    value: StudentProjectData[keyof StudentProjectData]
  ) => {
    const updated = [...projects];
    updated[index] = {
      ...updated[index],
      [field]: value,
    };
    onChange(updated);
  };

  const handleRemoveProject = (index: number) => {
    onChange(projects.filter((_, i) => i !== index));
  };

  const handleTechStackChange = (index: number, rawText: string) => {
    const tags = rawText
      .split(",")
      .map((t) => t.trim())
      .filter((t) => t.length > 0);
    handleUpdateProject(index, "techStack", tags);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-sm font-semibold flex items-center gap-2">
            <FolderGit2 className="size-4 text-primary" />
            Highlighted Projects ({projects.length})
          </h4>
          <p className="text-xs text-muted-foreground mt-0.5">
            Key applications you built, system architectures, or open-source tools
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleAddProject}
          className="gap-1.5"
        >
          <Plus className="size-3.5" />
          Add Project
        </Button>
      </div>

      {projects.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-6 text-center bg-card/30">
          <FileCode2 className="size-8 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm font-medium">No projects added yet</p>
          <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
            Adding projects provides context for your AI interviewer to ask system design and coding questions.
          </p>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={handleAddProject}
            className="mt-3 gap-1.5"
          >
            <Plus className="size-3.5" />
            Add First Project
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {projects.map((project, idx) => (
            <div
              key={idx}
              className="relative rounded-xl border border-border bg-card p-4 space-y-4 shadow-xs"
            >
              {/* Header: Project Index & Delete */}
              <div className="flex items-center justify-between border-b border-border/60 pb-3">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Project #{idx + 1}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  onClick={() => handleRemoveProject(idx)}
                  className="text-muted-foreground hover:text-destructive"
                  title="Remove this project"
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </div>

              {/* Title & Description */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-xs font-medium text-foreground">
                    Project Title <span className="text-destructive">*</span>
                  </label>
                  <Input
                    placeholder="e.g. Distributed Task Queue"
                    value={project.title}
                    onChange={(e) =>
                      handleUpdateProject(idx, "title", e.target.value)
                    }
                  />
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-xs font-medium text-foreground">
                    Brief Overview & Architecture
                  </label>
                  <Textarea
                    placeholder="What does it do? What problems did you solve (e.g. built with Redis & WebSocket for 10k concurrent users)?"
                    value={project.description || ""}
                    onChange={(e) =>
                      handleUpdateProject(idx, "description", e.target.value)
                    }
                    className="min-h-16 text-xs"
                  />
                </div>
              </div>

              {/* Repo URL & Live URL */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                    <GithubIcon className="size-3.5 text-foreground" />
                    Repository URL
                  </label>
                  <Input
                    type="url"
                    placeholder="https://github.com/user/project"
                    value={project.repoUrl || ""}
                    onChange={(e) =>
                      handleUpdateProject(idx, "repoUrl", e.target.value)
                    }
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                    <ExternalLink className="size-3.5 text-foreground" />
                    Live Demo URL
                  </label>
                  <Input
                    type="url"
                    placeholder="https://project.vercel.app"
                    value={project.liveUrl || ""}
                    onChange={(e) =>
                      handleUpdateProject(idx, "liveUrl", e.target.value)
                    }
                  />
                </div>
              </div>

              {/* Tech Stack comma separated */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                  <Layers className="size-3.5 text-foreground" />
                  Tech Stack (comma separated)
                </label>
                <Input
                  placeholder="e.g. Next.js, TypeScript, PostgreSQL, Tailwind"
                  value={(project.techStack || []).join(", ")}
                  onChange={(e) => handleTechStackChange(idx, e.target.value)}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
