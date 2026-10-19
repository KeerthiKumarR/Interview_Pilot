"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Send,
  Loader2,
  Sparkles,
  Bot,
  User,
  PlusCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export interface ExtractedProfileData {
  targetRole?: string;
  githubUsername?: string;
  leetcodeUsername?: string;
  linkedinUrl?: string;
  linkedinAbout?: string;
  skills?: string[];
  projects?: Array<{
    title: string;
    description?: string;
    repoUrl?: string;
    liveUrl?: string;
    techStack?: string[];
  }>;
  achievements?: Array<{
    title: string;
    category?: string;
    description?: string;
    date?: string;
  }>;
  [key: string]: unknown;
}

interface ChatMessage {
  role: "assistant" | "user";
  content: string;
  extracted?: ExtractedProfileData;
}

interface ChatIntakeAssistantProps {
  onApplyExtracted: (extracted: ExtractedProfileData) => void;
}

export function ChatIntakeAssistant({ onApplyExtracted }: ChatIntakeAssistantProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content:
        "Hi! I'm your Placement Readiness AI. You can talk to me naturally and share your details in any order — your GitHub handle, target role, LeetCode stats, project demo links, or hackathon wins. I'll automatically organize them into your placement dossier!",
    },
  ]);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const chatContainerRef = useRef<HTMLDivElement | null>(null);

  const scrollToBottom = (behavior: ScrollBehavior = "smooth") => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTo({
        top: chatContainerRef.current.scrollHeight,
        behavior,
      });
    }
  };

  useEffect(() => {
    scrollToBottom("smooth");
  }, [messages, isSending]);

  const handleSendMessage = async (textToSend?: string) => {
    const text = textToSend || input;
    if (!text || !text.trim() || isSending) return;

    const userMsg = text.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: userMsg }]);
    setIsSending(true);

    try {
      const res = await fetch("/api/profile/chat-intake", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMsg,
          history: messages.map((m) => ({ role: m.role, content: m.content })),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to process message");

      const extracted = data.extracted || {};
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: data.reply,
          extracted: Object.keys(extracted).length > 0 ? extracted : undefined,
        },
      ]);

      // If anything meaningful was extracted, apply to form state immediately
      if (
        extracted.targetRole ||
        extracted.githubUsername ||
        extracted.leetcodeUsername ||
        extracted.linkedinUrl ||
        extracted.linkedinAbout ||
        (extracted.skills && extracted.skills.length > 0) ||
        (extracted.projects && extracted.projects.length > 0) ||
        (extracted.achievements && extracted.achievements.length > 0)
      ) {
        onApplyExtracted(extracted);
        toast.success("Profile fields automatically updated from your chat!");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to communicate with assistant.";
      toast.error(msg);
    } finally {
      setIsSending(false);
    }
  };

  const samplePrompts = [
    "I'm targeting Full Stack roles. GitHub: github.com/johndev, LeetCode: john_codes",
    "I built a SaaS platform in Next.js, Prisma, and Stripe with live demo at saas.vercel.app",
    "I won 2nd place in Smart India Hackathon 2025 and hold AWS Cloud Practitioner certification",
  ];

  return (
    <Card className="border-primary/20 bg-card/60 backdrop-blur-xs">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Bot className="size-4 text-primary" />
            AI Conversational Intake Assistant
          </CardTitle>
          <Badge variant="outline" className="border-primary/30 text-primary text-[11px] gap-1">
            <Sparkles className="size-3" />
            Module 1 Chat Intake
          </Badge>
        </div>
        <CardDescription>
          Talk to the assistant like a placement mentor. Tell it about your tech stack, projects, and handles in any order.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Chat History Box */}
        <div
          ref={chatContainerRef}
          className="flex flex-col gap-3 rounded-lg border border-border bg-background/50 p-4 max-h-[340px] min-h-[180px] overflow-y-auto"
        >
          {messages.map((m, idx) => (
            <div
              key={idx}
              className={`flex items-start gap-2.5 ${
                m.role === "user" ? "flex-row-reverse" : "flex-row"
              }`}
            >
              <div
                className={`flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                  m.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-foreground"
                }`}
              >
                {m.role === "user" ? <User className="size-3.5" /> : <Bot className="size-3.5 text-primary" />}
              </div>

              <div
                className={`max-w-[85%] rounded-lg px-3.5 py-2.5 text-xs leading-relaxed ${
                  m.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "border border-border bg-card text-foreground"
                }`}
              >
                <p className="whitespace-pre-wrap">{m.content}</p>

                {/* Extracted preview tags */}
                {m.extracted && (
                  <div className="mt-2.5 pt-2 border-t border-border/40 flex flex-wrap gap-1">
                    {m.extracted.targetRole && (
                      <Badge variant="secondary" className="text-[10px] py-0">
                        Role: {m.extracted.targetRole}
                      </Badge>
                    )}
                    {m.extracted.githubUsername && (
                      <Badge variant="secondary" className="text-[10px] py-0">
                        GitHub: @{m.extracted.githubUsername}
                      </Badge>
                    )}
                    {m.extracted.leetcodeUsername && (
                      <Badge variant="secondary" className="text-[10px] py-0">
                        LeetCode: @{m.extracted.leetcodeUsername}
                      </Badge>
                    )}
                    {m.extracted.skills?.map((s: string) => (
                      <Badge key={s} variant="secondary" className="text-[10px] py-0">
                        +{s}
                      </Badge>
                    ))}
                    {m.extracted.projects?.map((p) => (
                      <Badge key={p.title} variant="secondary" className="text-[10px] py-0">
                        Project: {p.title}
                      </Badge>
                    ))}
                    {m.extracted.achievements?.map((a) => (
                      <Badge key={a.title} variant="secondary" className="text-[10px] py-0">
                        Award: {a.title}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}

          {isSending && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground italic">
              <Loader2 className="size-3.5 animate-spin text-primary" />
              <span>Analyzing and extracting profile details...</span>
            </div>
          )}
        </div>

        {/* Quick prompt suggestions */}
        <div className="space-y-1.5">
          <p className="text-[11px] font-medium text-muted-foreground flex items-center gap-1">
            <PlusCircle className="size-3" /> Quick suggestions (click to send):
          </p>
          <div className="flex flex-wrap gap-1.5">
            {samplePrompts.map((prompt, i) => (
              <button
                key={i}
                type="button"
                disabled={isSending}
                onClick={() => handleSendMessage(prompt)}
                className="rounded-md border border-border bg-muted/40 px-2 py-1 text-[11px] text-muted-foreground hover:bg-muted/80 hover:text-foreground transition-colors text-left cursor-pointer truncate max-w-full"
              >
                &ldquo;{prompt}&rdquo;
              </button>
            ))}
          </div>
        </div>

        {/* Input box */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="flex items-center gap-2"
        >
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your background, projects, or handles in any order..."
            disabled={isSending}
            className="text-xs"
          />
          <Button type="submit" size="sm" disabled={isSending || !input.trim()} className="gap-1.5 shrink-0">
            {isSending ? <Loader2 className="size-3.5 animate-spin" /> : <Send className="size-3.5" />}
            Send
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
