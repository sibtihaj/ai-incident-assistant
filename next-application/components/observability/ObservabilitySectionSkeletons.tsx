"use client";

import type { ComponentPropsWithoutRef } from "react";

function ShimmerBlock({
  className,
  ...rest
}: ComponentPropsWithoutRef<"div">) {
  return (
    <div
      className={`rounded-sm bg-slate-200/80 motion-safe:animate-pulse motion-reduce:animate-none ${className ?? ""}`}
      {...rest}
    />
  );
}

export function RuntimeSectionSkeleton() {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="space-y-3 rounded-sm border border-slate-200 bg-slate-50/80 p-4">
        <ShimmerBlock className="h-2.5 w-28" />
        <ShimmerBlock className="h-6 w-24" />
        <ShimmerBlock className="h-3 w-full max-w-[200px]" />
      </div>
      <div className="space-y-3 rounded-sm border border-slate-200 bg-slate-50/80 p-4">
        <ShimmerBlock className="h-2.5 w-28" />
        <ShimmerBlock className="h-6 w-24" />
        <ShimmerBlock className="h-3 w-full max-w-[180px]" />
      </div>
    </div>
  );
}

export function QuotaSectionSkeleton() {
  return (
    <div className="space-y-2">
      <ShimmerBlock className="h-4 w-56" />
      <ShimmerBlock className="h-3 w-40" />
    </div>
  );
}

export function GatewayCreditsSkeleton() {
  return (
    <div className="space-y-3">
      <ShimmerBlock className="h-3 w-full max-w-md" />
      <dl className="mt-3 grid gap-2 sm:grid-cols-2">
        <div className="space-y-2">
          <ShimmerBlock className="h-2 w-16" />
          <ShimmerBlock className="h-5 w-32" />
        </div>
        <div className="space-y-2">
          <ShimmerBlock className="h-2 w-20" />
          <ShimmerBlock className="h-5 w-32" />
        </div>
      </dl>
    </div>
  );
}

export function GatewayReportTableSkeleton() {
  return (
    <div className="mt-3 overflow-hidden rounded-sm border border-slate-200">
      <div className="grid grid-cols-[48px_1fr] gap-0 bg-slate-100 px-3 py-2">
        <ShimmerBlock className="h-3 w-8" />
        <ShimmerBlock className="h-3 w-16" />
      </div>
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className="grid grid-cols-[48px_1fr] items-center gap-2 border-t border-slate-100 px-3 py-2.5"
        >
          <ShimmerBlock className="h-3 w-6" />
          <ShimmerBlock className="h-3 w-full" />
        </div>
      ))}
    </div>
  );
}

export function LangSmithTableSkeleton() {
  return (
    <div className="mt-3 overflow-hidden rounded-sm border border-slate-200">
      <div className="flex gap-3 bg-slate-100 px-3 py-2">
        <ShimmerBlock className="h-3 w-20" />
        <ShimmerBlock className="h-3 w-12" />
        <ShimmerBlock className="h-3 w-24" />
        <ShimmerBlock className="h-3 w-14" />
        <ShimmerBlock className="h-3 flex-1 max-w-[120px]" />
      </div>
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="flex gap-3 border-t border-slate-100 px-3 py-2.5"
        >
          <ShimmerBlock className="h-3 w-28" />
          <ShimmerBlock className="h-3 w-14" />
          <ShimmerBlock className="h-3 w-36" />
          <ShimmerBlock className="h-3 w-16" />
          <ShimmerBlock className="h-3 flex-1" />
        </div>
      ))}
    </div>
  );
}

export function NotesSectionSkeleton() {
  return (
    <div className="space-y-3 rounded-sm border border-slate-200 bg-slate-50 p-4">
      <ShimmerBlock className="h-3 w-20" />
      <div className="space-y-2 pl-1">
        <ShimmerBlock className="h-3 w-full" />
        <ShimmerBlock className="h-3 w-[92%]" />
        <ShimmerBlock className="h-3 w-[88%]" />
      </div>
      <ShimmerBlock className="h-3 w-48" />
    </div>
  );
}
