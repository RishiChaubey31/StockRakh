'use client';

function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse bg-slate-200 rounded-lg ${className}`} />;
}

export function StatCardSkeleton() {
  return (
    <div className="bg-white rounded-xl border border-slate-200/60 shadow-sm p-5 sm:p-6">
      <div className="flex items-start justify-between">
        <div className="space-y-3 flex-1">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-9 w-20" />
          <Skeleton className="h-3 w-32" />
        </div>
        <Skeleton className="w-12 h-12 rounded-xl" />
      </div>
    </div>
  );
}

export function PartCardSkeleton() {
  return (
    <div className="bg-white rounded-xl border border-slate-200/60 shadow-sm overflow-hidden">
      <Skeleton className="h-40 rounded-none" />
      <div className="p-4 space-y-3">
        <Skeleton className="h-5 w-3/4" />
        <div className="grid grid-cols-2 gap-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
        </div>
        <Skeleton className="h-9 w-full" />
      </div>
    </div>
  );
}

export function PartListRowSkeleton() {
  return (
    <div className="bg-white rounded-xl border border-slate-200/60 shadow-sm p-4 flex items-center gap-4">
      <Skeleton className="w-14 h-14 rounded-lg flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-3 w-1/2" />
      </div>
      <Skeleton className="w-16 h-8" />
    </div>
  );
}

export function ActivitySkeleton() {
  return (
    <div className="px-5 sm:px-6 py-4 flex items-center gap-3">
      <Skeleton className="w-20 h-6 rounded-full" />
      <Skeleton className="h-4 w-1/3" />
      <div className="ml-auto">
        <Skeleton className="h-4 w-24" />
      </div>
    </div>
  );
}

export function TableRowSkeleton({ cols = 6 }: { cols?: number }) {
  return (
    <tr>
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <Skeleton className="h-4 w-full" />
        </td>
      ))}
    </tr>
  );
}

export { Skeleton };
