export function AppSkeleton() {
  return (
    <div role="status" aria-busy aria-label="Loading Binome" className="fixed inset-0 flex flex-col bg-neutral-950">
      <span className="sr-only">Loading Binome</span>

      {/* Header: logo chip + wordmark placeholders + two menu circles */}
      <div className="border-b border-neutral-800">
        <div className="mx-auto flex w-full max-w-2xl items-center justify-between gap-4 p-4">
          <div className="flex items-center gap-3">
            <div className="size-9 animate-pulse rounded-xl bg-neutral-800" />
            <div className="flex flex-col gap-1.5">
              <div className="h-3.5 w-14 animate-pulse rounded bg-neutral-700" />
              <div className="h-2.5 w-24 animate-pulse rounded bg-neutral-800" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="size-8 animate-pulse rounded-full bg-neutral-800" />
            <div className="size-8 animate-pulse rounded-full bg-neutral-800" />
          </div>
        </div>
      </div>

      {/* Timer list rows */}
      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-3 px-4 py-4">
        <div className="h-14 animate-pulse rounded-lg bg-neutral-800" />
        <div className="h-14 animate-pulse rounded-lg bg-neutral-800" />
        <div className="h-14 animate-pulse rounded-lg bg-neutral-800" />
        <div className="h-14 animate-pulse rounded-lg bg-neutral-800" />
      </div>

      {/* Footer line */}
      <div className="flex justify-center py-2">
        <div className="h-3 w-12 animate-pulse rounded bg-neutral-800" />
      </div>
    </div>
  );
}
