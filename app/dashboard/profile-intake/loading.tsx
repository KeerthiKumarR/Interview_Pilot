import React from "react";
import { Skeleton } from "@/components/ui/skeleton";

export default function ProfileIntakeLoading() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 space-y-8 animate-in fade-in-50 duration-150">
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-32 rounded-md" />
        <Skeleton className="h-4 w-28 rounded-md" />
      </div>

      <div className="space-y-2">
        <Skeleton className="h-8 w-72 rounded-lg" />
        <Skeleton className="h-4 w-96 rounded-md" />
      </div>

      <div className="rounded-2xl border border-border/50 bg-card/40 p-6 space-y-4">
        <Skeleton className="h-6 w-52 rounded-md" />
        <Skeleton className="h-32 w-full rounded-xl border-2 border-dashed border-border/40" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-xl border border-border/50 bg-card/40 p-5 space-y-3">
          <Skeleton className="h-5 w-40 rounded-md" />
          <Skeleton className="h-10 w-full rounded-lg" />
          <Skeleton className="h-10 w-full rounded-lg" />
        </div>
        <div className="rounded-xl border border-border/50 bg-card/40 p-5 space-y-3">
          <Skeleton className="h-5 w-40 rounded-md" />
          <Skeleton className="h-24 w-full rounded-lg" />
        </div>
      </div>
    </div>
  );
}
