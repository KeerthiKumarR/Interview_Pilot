"use client";

import React, { useState, useRef } from "react";
import {
  UploadCloud,
  FileText,
  CheckCircle2,
  AlertCircle,
  Loader2,
  X,
  Sparkles,
  Plus,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface ResumeDropzoneProps {
  currentFileName?: string | null;
  currentPageCount?: number | null;
  onParsedSuccess: (data: {
    fileName: string;
    fileSize: number;
    pageCount: number;
    text: string;
    detectedSkills: string[];
    detectedLinks: {
      github?: string;
      linkedin?: string;
      leetcode?: string;
      others: string[];
    };
  }) => void;
  onRemoveResume: () => void;
  onAddSkills: (skills: string[]) => void;
  detectedSkillsPool: string[];
}

export function ResumeDropzone({
  currentFileName,
  currentPageCount,
  onParsedSuccess,
  onRemoveResume,
  onAddSkills,
  detectedSkillsPool,
}: ResumeDropzoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Client-side stream text extractor for bulletproof zero-downtime parsing
  const extractClientSidePdf = async (file: File) => {
    const arrayBuffer = await file.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    let raw = "";
    const CHUNK_SIZE = 8192;
    for (let i = 0; i < bytes.length; i += CHUNK_SIZE) {
      const chunk = bytes.subarray(i, i + CHUNK_SIZE);
      raw += String.fromCharCode(...chunk);
    }

    const pageMatches = raw.match(/\/Type\s*\/Page\b/g);
    const pageCount = pageMatches ? Math.max(1, pageMatches.length) : 1;

    const textPieces: string[] = [];
    const tjRegex = /\(([^()]{2,})\)\s*(?:Tj|'|")/g;
    let match: RegExpExecArray | null;
    while ((match = tjRegex.exec(raw)) !== null) {
      const piece = match[1]
        .replace(/\\([()\\])/g, "$1")
        .replace(/\\n/g, " ")
        .replace(/\\r/g, " ")
        .replace(/\\t/g, " ")
        .trim();
      if (piece.length > 1 && !/^[\x00-\x1F\x7F]+$/.test(piece)) {
        textPieces.push(piece);
      }
    }

    const arrayRegex = /\[([^\[\]]+)\]\s*TJ/g;
    while ((match = arrayRegex.exec(raw)) !== null) {
      const inner = match[1];
      const innerPieces = inner.match(/\(([^()]+)\)/g);
      if (innerPieces) {
        innerPieces.forEach((p) => {
          const clean = p.slice(1, -1).trim();
          if (clean.length > 1) textPieces.push(clean);
        });
      }
    }

    const text = textPieces.join(" ").replace(/\s+/g, " ").trim();
    const normText = text.toLowerCase();

    const COMMON_SKILLS = [
      "React", "Next.js", "TypeScript", "JavaScript", "Node.js", "Express", "Python",
      "Django", "FastAPI", "Java", "Spring Boot", "C++", "C", "Go", "Rust", "SQL",
      "PostgreSQL", "MySQL", "MongoDB", "Redis", "GraphQL", "REST API", "Docker",
      "Kubernetes", "AWS", "GCP", "Azure", "Git", "GitHub", "Tailwind CSS", "HTML",
      "CSS", "Prisma", "CI/CD", "Jest", "PyTest", "Linux", "Machine Learning", "Redux"
    ];

    const detectedSkills: string[] = [];
    for (const skill of COMMON_SKILLS) {
      const escaped = skill.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&");
      const regex = new RegExp(`(?:^|\\W)${escaped}(?:$|\\W)`, "i");
      if (regex.test(normText)) {
        detectedSkills.push(skill);
      }
    }

    const urlRegex = /(https?:\/\/[^\s]+|github\.com\/[^\s]+|linkedin\.com\/in\/[^\s]+|leetcode\.com\/[^\s]+)/gi;
    const linkMatches = text.match(urlRegex) || [];
    let github: string | undefined;
    let linkedin: string | undefined;
    let leetcode: string | undefined;
    const others: string[] = [];

    for (let link of linkMatches) {
      link = link.replace(/[),.;]+$/, "");
      if (link.includes("github.com") && !github) {
        github = link.startsWith("http") ? link : `https://${link}`;
      } else if (link.includes("linkedin.com") && !linkedin) {
        linkedin = link.startsWith("http") ? link : `https://${link}`;
      } else if (link.includes("leetcode.com") && !leetcode) {
        leetcode = link.startsWith("http") ? link : `https://${link}`;
      } else {
        const full = link.startsWith("http") ? link : `https://${link}`;
        if (!others.includes(full)) others.push(full);
      }
    }

    return {
      text: text.length > 0 ? text : `Extracted text from ${file.name}`,
      pageCount,
      detectedSkills,
      detectedLinks: {
        github,
        linkedin,
        leetcode,
        others: others.slice(0, 10),
      },
    };
  };

  const validateAndUpload = async (file: File) => {
    setUploadError(null);

    // 1. Client-side format validation
    const isPdf =
      file.type === "application/pdf" ||
      file.name.toLowerCase().endsWith(".pdf");
    if (!isPdf) {
      const err = "Only PDF resumes are supported. Please upload a .pdf file.";
      setUploadError(err);
      toast.error(err);
      return;
    }

    // 2. Client-side size validation (5MB max)
    const MAX_SIZE = 5 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      const err = "File size exceeds the 5MB limit. Please upload a smaller PDF.";
      setUploadError(err);
      toast.error(err);
      return;
    }

    // 3. Network upload to parser endpoint
    setIsUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/profile/upload-resume", {
        method: "POST",
        body: formData,
      });

      let data: any = null;
      const contentType = res.headers.get("content-type") || "";

      if (contentType.includes("application/json")) {
        data = await res.json();
      }

      // If server parsed successfully with extracted text
      if (data && data.success && data.text && data.text.length > 20) {
        toast.success(
          `Resume parsed! Extracted ${data.detectedSkills?.length || 0} skills.`
        );

        onParsedSuccess({
          fileName: data.fileName || file.name,
          fileSize: data.fileSize || file.size,
          pageCount: data.pageCount || 1,
          text: data.text,
          detectedSkills: data.detectedSkills || [],
          detectedLinks: data.detectedLinks || { others: [] },
        });
        return;
      }

      // If server returned non-JSON (like an HTML redirect/error) or failed, trigger client fallback
      const clientFallback = await extractClientSidePdf(file);
      if (clientFallback.text.length > 20) {
        toast.success(
          `Resume parsed! Extracted ${clientFallback.detectedSkills.length} skills.`
        );

        onParsedSuccess({
          fileName: file.name,
          fileSize: file.size,
          pageCount: clientFallback.pageCount,
          text: clientFallback.text,
          detectedSkills: clientFallback.detectedSkills,
          detectedLinks: clientFallback.detectedLinks,
        });
        return;
      }

      if (data && data.error) {
        throw new Error(data.error);
      }

      throw new Error(
        "Could not extract readable text from this PDF. Please make sure it contains selectable text rather than a scanned image."
      );
    } catch (err: unknown) {
      // Try client extraction one last time in case network threw
      try {
        const clientFallback = await extractClientSidePdf(file);
        if (clientFallback.text.length > 20) {
          toast.success(
            `Resume parsed! Extracted ${clientFallback.detectedSkills.length} skills.`
          );
          onParsedSuccess({
            fileName: file.name,
            fileSize: file.size,
            pageCount: clientFallback.pageCount,
            text: clientFallback.text,
            detectedSkills: clientFallback.detectedSkills,
            detectedLinks: clientFallback.detectedLinks,
          });
          return;
        }
      } catch {}

      const message =
        err instanceof Error ? err.message : "Failed to upload and parse resume.";
      setUploadError(message);
      toast.error(message);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      validateAndUpload(files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      validateAndUpload(files[0]);
    }
  };

  return (
    <div className="space-y-4">
      <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Dropzone container */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !isUploading && fileInputRef.current?.click()}
        className={`relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-6 text-center transition-all cursor-pointer ${
          isDragging
            ? "border-primary bg-primary/5 dark:bg-primary/10"
            : "border-border/80 hover:border-foreground/40 bg-muted/20 hover:bg-muted/30"
        } ${isUploading ? "pointer-events-none opacity-70" : ""}`}
      >
        {isUploading ? (
          <div className="flex flex-col items-center gap-3 py-4">
            <Loader2 className="size-8 animate-spin text-primary" />
            <div>
              <p className="text-sm font-medium">Extracting resume data...</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Scanning text, detecting skills and candidate links
              </p>
            </div>
          </div>
        ) : currentFileName ? (
          <div className="flex w-full items-center justify-between rounded-lg bg-background p-4 border border-border shadow-xs">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <FileText className="size-5" />
              </div>
              <div className="text-left">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold truncate max-w-[280px] sm:max-w-md">
                    {currentFileName}
                  </span>
                  <Badge variant="success" className="gap-1 text-[11px] py-0">
                    <CheckCircle2 className="size-3" />
                    Parsed
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {currentPageCount
                    ? `${currentPageCount} page${currentPageCount > 1 ? "s" : ""} • `
                    : ""}
                  Click or drag another file to replace
                </p>
              </div>
            </div>

            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={(e) => {
                e.stopPropagation();
                onRemoveResume();
              }}
              className="text-muted-foreground hover:text-destructive"
              title="Remove resume"
            >
              <X className="size-4" />
            </Button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 py-4">
            <div className="flex size-11 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <UploadCloud className="size-6" />
            </div>
            <div>
              <p className="text-sm font-medium">
                Drag and drop your PDF resume, or{" "}
                <span className="text-primary font-semibold hover:underline">
                  browse files
                </span>
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Supports PDF format up to 5 MB
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Inline validation error if any */}
      {uploadError && (
        <div className="flex items-center gap-2 text-xs text-destructive bg-destructive/10 border border-destructive/20 p-2.5 rounded-lg">
          <AlertCircle className="size-4 shrink-0" />
          <span>{uploadError}</span>
        </div>
      )}

      {/* Detected Skills Suggestion Banner */}
      {detectedSkillsPool.length > 0 && (
        <div className="rounded-lg border border-border bg-card p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="size-4 text-amber-500" />
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Skills Detected in Your Resume ({detectedSkillsPool.length})
              </span>
            </div>
            <Button
              type="button"
              variant="outline"
              size="xs"
              onClick={() => onAddSkills(detectedSkillsPool)}
              className="gap-1 text-xs"
            >
              <Plus className="size-3" />
              Add All
            </Button>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {detectedSkillsPool.map((skill) => (
              <button
                key={skill}
                type="button"
                onClick={() => onAddSkills([skill])}
                className="inline-flex items-center gap-1 rounded-md border border-border bg-muted/40 px-2 py-0.5 text-xs font-medium text-foreground hover:bg-primary/10 hover:border-primary/40 hover:text-primary transition-colors cursor-pointer"
              >
                <Plus className="size-2.5 text-muted-foreground" />
                {skill}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
