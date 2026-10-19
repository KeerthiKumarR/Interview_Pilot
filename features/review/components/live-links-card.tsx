"use client";

import React from "react";
import {
  Globe,
  CheckCircle2,
  XCircle,
  ExternalLink,
  ShieldCheck,
  Zap,
} from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LiveLinkCheckResult } from "@/lib/review/full-auditor";

interface LiveLinksCardProps {
  data: LiveLinkCheckResult;
}

export function LiveLinksCard({ data }: LiveLinksCardProps) {
  return (
    <Card className="shadow-xs border-border">
      <CardHeader className="pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="space-y-1">
            <CardTitle className="text-base flex items-center gap-2">
              <Globe className="size-4 text-primary" />
              Live Project Demo Link Pings
            </CardTitle>
            <CardDescription>
              HTTP response verification, latency response checks, and SSL certificate inspection.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <div className="text-right">
              <span className="text-xl font-bold tracking-tight">
                {data.score}
              </span>
              <span className="text-xs text-muted-foreground">/100</span>
            </div>
            <Badge
              variant={data.score >= 70 ? "success" : "secondary"}
              className="text-xs py-0.5"
            >
              {data.score >= 70 ? "Responsive" : "Unverified"}
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 gap-3">
          {data.links.map((link, idx) => {
            const isOnline = link.status === "online";
            const isMissing = link.status === "not_provided";

            return (
              <div
                key={idx}
                className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border p-3.5 transition-colors ${
                  isOnline
                    ? "border-border/60 bg-muted/10"
                    : isMissing
                    ? "border-border/40 bg-card"
                    : "border-destructive/20 bg-destructive/5"
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 shrink-0">
                    {isOnline ? (
                      <CheckCircle2 className="size-4 text-emerald-500" />
                    ) : (
                      <XCircle className="size-4 text-destructive" />
                    )}
                  </div>

                  <div className="space-y-1 text-left">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-foreground">
                        {link.title}
                      </span>
                      {link.isHttps && (
                        <Badge
                          variant="outline"
                          className="text-[10px] py-0 h-4 gap-1 text-muted-foreground"
                        >
                          <ShieldCheck className="size-2.5 text-emerald-500" />
                          HTTPS
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {link.message}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
                  {link.latencyMs !== undefined && (
                    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground bg-muted/40 px-2 py-0.5 rounded-md">
                      <Zap className="size-3 text-amber-500" />
                      {link.latencyMs}ms
                    </span>
                  )}

                  {link.url && (
                    <a
                      href={link.url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-2.5 py-1 text-xs font-medium text-foreground hover:bg-muted transition-colors"
                    >
                      Visit
                      <ExternalLink className="size-3" />
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
