"use client";

import React, { useRef, useState, useEffect, useCallback } from "react";
import { useTheme } from "next-themes";
import { useInterviewStore } from "@/features/interview/store/interview-store";
import {
  MousePointer2,
  Square,
  Circle,
  MoveRight,
  Pencil,
  Type,
  Layout,
  Grid,
  Image as ImageIcon,
  Undo2,
  Redo2,
  Trash2,
  ZoomIn,
  ZoomOut,
} from "lucide-react";

type ToolType = "select" | "rect" | "circle" | "arrow" | "pen" | "text" | "layout" | "grid" | "image";

interface WhiteboardCanvasProps {
  onNextCategory?: () => void;
}

export function WhiteboardCanvas({ onNextCategory }: WhiteboardCanvasProps) {
  const { resolvedTheme } = useTheme();
  const isLight = resolvedTheme === "light";

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [activeTool, setActiveTool] = useState<ToolType>("pen");
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const [startPos, setStartPos] = useState<{ x: number; y: number } | null>(null);
  const [snapshot, setSnapshot] = useState<ImageData | null>(null);

  // History stack for Undo / Redo
  const [history, setHistory] = useState<ImageData[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);

  const setDrawingData = useInterviewStore((s) => s.setDrawingData);

  // Theme-aware colors
  const bgColor = isLight ? "#f8fafc" : "#0c0d12";
  const dotColor = isLight ? "rgba(15, 23, 42, 0.12)" : "rgba(255, 255, 255, 0.08)";
  const strokeColor = isLight ? "#0f172a" : "#ffffff";
  const boxFillColor = isLight ? "#ffffff" : "#12141d";
  const boxBorderColor = isLight ? "#cbd5e1" : "rgba(255, 255, 255, 0.8)";
  const boxTextColor = isLight ? "#0f172a" : "#ffffff";
  const subtitleColor = isLight ? "rgba(15, 23, 42, 0.6)" : "rgba(255, 255, 255, 0.5)";
  const arrowColor = isLight ? "rgba(15, 23, 42, 0.6)" : "rgba(255, 255, 255, 0.6)";
  const arrowLabelColor = isLight ? "rgba(15, 23, 42, 0.7)" : "rgba(255, 255, 255, 0.7)";

  // Draw initial system architecture diagram template if blank
  const drawDefaultDiagram = useCallback((ctx: CanvasRenderingContext2D, width: number, height: number) => {
    ctx.strokeStyle = strokeColor;
    ctx.fillStyle = strokeColor;
    ctx.lineWidth = 1.8;
    ctx.font = "13px ui-sans-serif, system-ui, sans-serif";

    // Helper to draw rounded rectangle box
    const drawBox = (x: number, y: number, w: number, h: number, title: string, subtitle?: string) => {
      ctx.beginPath();
      ctx.roundRect(x, y, w, h, 8);
      ctx.fillStyle = boxFillColor;
      ctx.fill();
      ctx.strokeStyle = boxBorderColor;
      ctx.stroke();

      // Title text
      ctx.fillStyle = boxTextColor;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(title, x + w / 2, y + (subtitle ? h / 2 - 8 : h / 2));

      if (subtitle) {
        ctx.fillStyle = subtitleColor;
        ctx.font = "11px ui-sans-serif, system-ui, sans-serif";
        ctx.fillText(subtitle, x + w / 2, y + h / 2 + 10);
        ctx.font = "13px ui-sans-serif, system-ui, sans-serif";
      }
    };

    // Helper to draw arrow
    const drawArrow = (x1: number, y1: number, x2: number, y2: number, label?: string, dashed = false) => {
      ctx.beginPath();
      if (dashed) ctx.setLineDash([5, 5]);
      else ctx.setLineDash([]);
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.strokeStyle = arrowColor;
      ctx.stroke();
      ctx.setLineDash([]);

      // Arrowhead
      const headlen = 8;
      const angle = Math.atan2(y2 - y1, x2 - x1);
      ctx.beginPath();
      ctx.moveTo(x2, y2);
      ctx.lineTo(x2 - headlen * Math.cos(angle - Math.PI / 6), y2 - headlen * Math.sin(angle - Math.PI / 6));
      ctx.moveTo(x2, y2);
      ctx.lineTo(x2 - headlen * Math.cos(angle + Math.PI / 6), y2 - headlen * Math.sin(angle + Math.PI / 6));
      ctx.stroke();

      if (label) {
        ctx.fillStyle = arrowLabelColor;
        ctx.font = "11px ui-sans-serif, system-ui, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(label, (x1 + x2) / 2, (y1 + y2) / 2 - 8);
        ctx.font = "13px ui-sans-serif, system-ui, sans-serif";
      }
    };

    // Coordinates scaled relative to container center
    const cx = width / 2;
    const cy = height / 2;

    // 1. Client Box
    drawBox(cx - 300, cy - 35, 120, 70, "Client");

    // 2. API Server Box
    drawBox(cx - 80, cy - 45, 130, 90, "API Server");

    // 3. Database Box
    drawBox(cx + 140, cy - 110, 140, 75, "Database");

    // 4. Cache Box
    drawBox(cx + 140, cy + 10, 140, 75, "Cache");

    // 5. Redis Box
    drawBox(cx + 150, cy + 120, 120, 60, "Redis");

    // Connectors
    drawArrow(cx - 180, cy, cx - 80, cy, "HTTPS");
    drawArrow(cx + 50, cy - 25, cx + 140, cy - 70, "Read / Write");
    drawArrow(cx + 50, cy + 20, cx + 140, cy + 45, "Read (fast)");
    drawArrow(cx + 210, cy + 85, cx + 210, cy + 120);
    drawArrow(cx + 140, cy + 50, cx + 5, cy + 45, "Cache Miss", true);
  }, [arrowColor, arrowLabelColor, boxBorderColor, boxFillColor, boxTextColor, strokeColor, subtitleColor]);

  // Initialize Canvas
  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const rect = container.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = rect.width;
    canvas.height = rect.height;

    // Draw background dot grid
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Subtle dot grid pattern
    ctx.fillStyle = dotColor;
    const dotSpacing = 24;
    for (let x = 12; x < canvas.width; x += dotSpacing) {
      for (let y = 12; y < canvas.height; y += dotSpacing) {
        ctx.beginPath();
        ctx.arc(x, y, 1, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Draw the template diagram
    drawDefaultDiagram(ctx, canvas.width, canvas.height);

    const initialSnapshot = ctx.getImageData(0, 0, canvas.width, canvas.height);
    setHistory([initialSnapshot]);
    setHistoryIndex(0);
  }, [bgColor, dotColor, drawDefaultDiagram]);

  useEffect(() => {
    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);
    return () => window.removeEventListener("resize", resizeCanvas);
  }, [resizeCanvas]);

  const saveHistory = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const currentImg = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const updated = history.slice(0, historyIndex + 1);
    updated.push(currentImg);
    if (updated.length > 20) updated.shift();
    setHistory(updated);
    setHistoryIndex(updated.length - 1);

    try {
      setDrawingData(canvas.toDataURL("image/webp", 0.5));
    } catch {}
  };

  const handleUndo = () => {
    if (historyIndex <= 0) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const nextIdx = historyIndex - 1;
    ctx.putImageData(history[nextIdx], 0, 0);
    setHistoryIndex(nextIdx);
  };

  const handleRedo = () => {
    if (historyIndex >= history.length - 1) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const nextIdx = historyIndex + 1;
    ctx.putImageData(history[nextIdx], 0, 0);
    setHistoryIndex(nextIdx);
  };

  const handleClear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Redraw dot grid
    ctx.fillStyle = dotColor;
    const dotSpacing = 24;
    for (let x = 12; x < canvas.width; x += dotSpacing) {
      for (let y = 12; y < canvas.height; y += dotSpacing) {
        ctx.beginPath();
        ctx.arc(x, y, 1, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    saveHistory();
  };

  // Drawing event handlers
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setIsDrawing(true);
    setStartPos({ x, y });
    setSnapshot(ctx.getImageData(0, 0, canvas.width, canvas.height));

    if (activeTool === "pen") {
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = 2;
      ctx.lineCap = "round";
    }
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (activeTool === "pen") {
      ctx.lineTo(x, y);
      ctx.stroke();
    } else if (snapshot && startPos) {
      ctx.putImageData(snapshot, 0, 0);
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = 2;

      if (activeTool === "rect") {
        ctx.strokeRect(startPos.x, startPos.y, x - startPos.x, y - startPos.y);
      } else if (activeTool === "circle") {
        const radius = Math.sqrt(Math.pow(x - startPos.x, 2) + Math.pow(y - startPos.y, 2));
        ctx.beginPath();
        ctx.arc(startPos.x, startPos.y, radius, 0, 2 * Math.PI);
        ctx.stroke();
      } else if (activeTool === "arrow") {
        ctx.beginPath();
        ctx.moveTo(startPos.x, startPos.y);
        ctx.lineTo(x, y);
        ctx.stroke();
      }
    }
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    saveHistory();
  };

  return (
    <div ref={containerRef} className="relative h-full w-full overflow-hidden bg-background">
      {/* ─── LEFT VERTICAL TOOL PALETTE ─── */}
      <div className="absolute left-4 top-1/2 -translate-y-1/2 z-20 flex flex-col items-center gap-1 rounded-xl border border-border bg-card/90 p-1.5 shadow-2xl backdrop-blur-md">
        <button
          type="button"
          onClick={() => setActiveTool("select")}
          className={`flex h-8 w-8 items-center justify-center rounded-lg transition cursor-pointer ${
            activeTool === "select" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
          }`}
          title="Select"
        >
          <MousePointer2 className="h-4 w-4" />
        </button>

        <button
          type="button"
          onClick={() => setActiveTool("rect")}
          className={`flex h-8 w-8 items-center justify-center rounded-lg transition cursor-pointer ${
            activeTool === "rect" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
          }`}
          title="Rectangle"
        >
          <Square className="h-4 w-4" />
        </button>

        <button
          type="button"
          onClick={() => setActiveTool("circle")}
          className={`flex h-8 w-8 items-center justify-center rounded-lg transition cursor-pointer ${
            activeTool === "circle" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
          }`}
          title="Circle"
        >
          <Circle className="h-4 w-4" />
        </button>

        <button
          type="button"
          onClick={() => setActiveTool("arrow")}
          className={`flex h-8 w-8 items-center justify-center rounded-lg transition cursor-pointer ${
            activeTool === "arrow" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
          }`}
          title="Arrow"
        >
          <MoveRight className="h-4 w-4" />
        </button>

        <button
          type="button"
          onClick={() => setActiveTool("pen")}
          className={`flex h-8 w-8 items-center justify-center rounded-lg transition cursor-pointer ${
            activeTool === "pen" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
          }`}
          title="Pencil / Draw"
        >
          <Pencil className="h-4 w-4" />
        </button>

        <button
          type="button"
          onClick={() => setActiveTool("text")}
          className={`flex h-8 w-8 items-center justify-center rounded-lg transition cursor-pointer ${
            activeTool === "text" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
          }`}
          title="Text"
        >
          <Type className="h-4 w-4" />
        </button>

        <button
          type="button"
          onClick={() => setActiveTool("layout")}
          className={`flex h-8 w-8 items-center justify-center rounded-lg transition cursor-pointer ${
            activeTool === "layout" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
          }`}
          title="Frame"
        >
          <Layout className="h-4 w-4" />
        </button>

        <button
          type="button"
          onClick={() => setActiveTool("grid")}
          className={`flex h-8 w-8 items-center justify-center rounded-lg transition cursor-pointer ${
            activeTool === "grid" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
          }`}
          title="Grid"
        >
          <Grid className="h-4 w-4" />
        </button>

        <button
          type="button"
          onClick={() => setActiveTool("image")}
          className={`flex h-8 w-8 items-center justify-center rounded-lg transition cursor-pointer ${
            activeTool === "image" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
          }`}
          title="Image"
        >
          <ImageIcon className="h-4 w-4" />
        </button>

        <div className="my-1 h-px w-5 bg-border" />

        <button
          type="button"
          onClick={handleUndo}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground transition cursor-pointer"
          title="Undo"
        >
          <Undo2 className="h-4 w-4" />
        </button>

        <button
          type="button"
          onClick={handleRedo}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground transition cursor-pointer"
          title="Redo"
        >
          <Redo2 className="h-4 w-4" />
        </button>
      </div>

      {/* ─── TOP HEADER CONTROLS (Pill + Clear Canvas) ─── */}
      <div className="absolute top-4 left-4 right-4 z-20 flex items-center justify-between pointer-events-none">
        <div className="pointer-events-auto rounded-full border border-border bg-card/90 px-3.5 py-1 text-xs font-medium text-foreground shadow-md backdrop-blur-md">
          System Design Whiteboard
        </div>

        <button
          type="button"
          onClick={handleClear}
          className="pointer-events-auto flex items-center gap-1.5 rounded-lg border border-border bg-card/90 px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-destructive/10 hover:border-destructive/30 hover:text-destructive transition cursor-pointer shadow-md backdrop-blur-md"
        >
          <Trash2 className="h-3.5 w-3.5" />
          <span>Clear Canvas</span>
        </button>
      </div>

      {/* ─── BOTTOM-LEFT ZOOM WIDGET ─── */}
      <div className="absolute bottom-6 left-4 z-20 flex items-center gap-2 rounded-lg border border-border bg-card/90 px-2 py-1 text-xs font-mono text-foreground shadow-md backdrop-blur-md">
        <button
          type="button"
          onClick={() => setZoomLevel((z) => Math.max(50, z - 10))}
          className="hover:text-primary p-0.5 cursor-pointer"
        >
          -
        </button>
        <span>{zoomLevel}%</span>
        <button
          type="button"
          onClick={() => setZoomLevel((z) => Math.min(200, z + 10))}
          className="hover:text-primary p-0.5 cursor-pointer"
        >
          +
        </button>
      </div>

      {/* ─── DRAWING CANVAS ─── */}
      <canvas
        ref={canvasRef}
        onMouseDown={startDrawing}
        onMouseMove={draw}
        onMouseUp={stopDrawing}
        onMouseLeave={stopDrawing}
        className="h-full w-full cursor-crosshair"
      />
    </div>
  );
}
