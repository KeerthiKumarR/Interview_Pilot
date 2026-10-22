import React from "react";
import { Skeleton } from "@/components/ui/skeleton";

export default function ReadinessLoading() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 space-y-8 animate-in fade-in-50 duration-150">
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-32 rounded-md" />
        <Skeleton className="h-4 w-28 rounded-md" />
      </div>

      {/* Hero card skeleton */}
      <div className="rounded-2xl border border-border/50 bg-card/40 p-8 space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="space-y-2">
            <Skeleton className="h-5 w-40 rounded-md" />
            <Skeleton className="h-10 w-64 rounded-lg" />
          </div>
          <Skeleton className="h-24 w-24 rounded-full" />
        </div>
        <Skeleton className="h-3 w-full rounded-full" />
      </div>

      {/* Breakdown grid skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="rounded-xl border border-border/50 bg-card/40 p-5 space-y-3">
            <div className="flex justify-between items-center">
              <Skeleton className="h-5 w-32 rounded-md" />
              <Skeleton className="h-5 w-12 rounded-md" />
            </div>
            <Skeleton className="h-2.5 w-full rounded-full" />
            <Skeleton className="h-3.5 w-48 rounded-md" />
          </div>
        ))}
      </div>
    </div>
  );
}
