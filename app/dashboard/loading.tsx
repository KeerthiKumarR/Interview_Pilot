import React from "react";
import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardLoading() {
  return (
    <div className="mx-auto max-w-4xl px-6 py-10 space-y-8 animate-in fade-in-50 duration-150">
      {/* Header skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Skeleton className="h-8 w-64 rounded-lg" />
            <Skeleton className="h-5 w-24 rounded-md" />
          </div>
          <Skeleton className="h-4 w-96 rounded-md" />
        </div>
        <Skeleton className="h-10 w-36 rounded-lg" />
      </div>

      {/* Profile banner skeleton */}
      <div className="p-4 rounded-xl border border-border/50 bg-card/40 space-y-2">
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-32 rounded-md" />
          <Skeleton className="h-5 w-28 rounded-md" />
          <Skeleton className="h-5 w-32 rounded-md" />
        </div>
        <Skeleton className="h-3.5 w-80 rounded-md" />
      </div>

      {/* Module 4-card grid skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="rounded-xl border border-border/50 bg-card/40 p-3.5 space-y-2">
            <Skeleton className="h-3 w-16 rounded-md" />
            <Skeleton className="h-4 w-28 rounded-md" />
            <Skeleton className="h-3 w-36 rounded-md" />
          </div>
        ))}
      </div>

      {/* Progress chart skeleton */}
      <div className="rounded-xl border border-border/50 bg-card/40 p-6 space-y-4">
        <div className="flex justify-between items-center">
          <Skeleton className="h-5 w-40 rounded-md" />
          <Skeleton className="h-4 w-20 rounded-md" />
        </div>
        <Skeleton className="h-48 w-full rounded-lg" />
      </div>

      {/* Previous interviews skeleton */}
      <div className="space-y-4">
        <Skeleton className="h-4 w-36 rounded-md" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-xl border border-border/40 bg-card/30 p-4 flex items-center justify-between">
              <div className="space-y-2">
                <Skeleton className="h-4 w-48 rounded-md" />
                <Skeleton className="h-3 w-32 rounded-md" />
              </div>
              <Skeleton className="h-8 w-24 rounded-lg" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
