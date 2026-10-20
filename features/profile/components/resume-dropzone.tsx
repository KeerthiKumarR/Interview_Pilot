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
import { extractSkillsFromResumeText } from "@/lib/profile/skills-extractor";

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

  // Client-side stream text extractor with pdfjs-dist primary and byte regex fallback
  const extractClientSidePdf = async (file: File) => {
    let text = "";
    let pageCount = 1;

    try {
      const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
      if (pdfjs.GlobalWorkerOptions && !pdfjs.GlobalWorkerOptions.workerSrc) {
        pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version || "5.4.296"}/legacy/build/pdf.worker.min.mjs`;
      }
      const arrayBuffer = await file.arrayBuffer();
      const loadingTask = pdfjs.getDocument({
        data: new Uint8Array(arrayBuffer),
        useSystemFonts: true,
      });
      const doc = await loadingTask.promise;
      pageCount = doc.numPages || 1;
      const pageTexts: string[] = [];

      for (let i = 1; i <= pageCount; i++) {
        const page = await doc.getPage(i);
        const content = await page.getTextContent();
        const pageStr = content.items
          .map((item: any) => (item && item.str ? item.str : ""))
          .join(" ");
        pageTexts.push(pageStr);
      }
      text = pageTexts.join("\n").trim();
    } catch (e) {
      console.warn("Client pdfjs parsing fallback to binary regex:", e);
    }

    if (text.length < 50) {
      const arrayBuffer = await file.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);
      let raw = "";
      const CHUNK_SIZE = 8192;
      for (let i = 0; i < bytes.length; i += CHUNK_SIZE) {
        const chunk = bytes.subarray(i, i + CHUNK_SIZE);
        raw += String.fromCharCode(...chunk);
      }

      const pageMatches = raw.match(/\/Type\s*\/Page\b/g);
      pageCount = pageMatches ? Math.max(1, pageMatches.length) : pageCount;

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

      const fallbackText = textPieces.join(" ").replace(/\s+/g, " ").trim();
      if (fallbackText.length > text.length) {
        text = fallbackText;
      }
    }

    // Detect skills directly from candidate's resume
    const detectedSkills = extractSkillsFromResumeText(text);

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

    if (!linkedin) {
      const liMatch = text.match(/linkedin\.com\s*\/\s*in\s*\/\s*([a-zA-Z0-9_-]{3,50})/i);
      if (liMatch && liMatch[1]) {
        linkedin = `https://linkedin.com/in/${liMatch[1]}`;
      }
    }

    if (!github) {
      const ghUrlMatch = text.match(/github\.com\s*\/\s*([a-zA-Z0-9_-]{3,38})/i);
      if (ghUrlMatch && ghUrlMatch[1] && !["com", "org", "gmail", "email", "in"].includes(ghUrlMatch[1].toLowerCase())) {
        github = `https://github.com/${ghUrlMatch[1]}`;
      } else {
        const ghHandleMatch = text.match(/(?:github\s*[:\-\/]\s*@?|@)([a-zA-Z0-9_-]{3,38})/i);
        if (ghHandleMatch && ghHandleMatch[1] && !["com", "org", "gmail", "email", "in"].includes(ghHandleMatch[1].toLowerCase())) {
          github = `https://github.com/${ghHandleMatch[1]}`;
        }
      }
    }

    if (!leetcode) {
      const lcHandleMatch = text.match(/leetcode(?:\.com)?\s*[:\-\/]\s*@?([a-zA-Z0-9_-]{3,38})/i);
      if (lcHandleMatch && lcHandleMatch[1]) {
        leetcode = `https://leetcode.com/${lcHandleMatch[1]}`;
      }
    }

    return {
      text: text.trim(),
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
        const skillsCount = data.detectedSkills?.length || 0;
        toast.success(
          skillsCount > 0
            ? `Resume parsed! Extracted ${skillsCount} skills.`
            : `Resume parsed! You can add or customize your skills below.`
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
      if (clientFallback.text && clientFallback.text.length > 20) {
        const skillsCount = clientFallback.detectedSkills.length;
        toast.success(
          skillsCount > 0
            ? `Resume parsed! Extracted ${skillsCount} skills.`
            : `Resume parsed! You can add or customize your skills below.`
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
        if (clientFallback.text && clientFallback.text.length > 20) {
          const skillsCount = clientFallback.detectedSkills.length;
          toast.success(
            skillsCount > 0
              ? `Resume parsed! Extracted ${skillsCount} skills.`
              : `Resume parsed! You can add or customize your skills below.`
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
