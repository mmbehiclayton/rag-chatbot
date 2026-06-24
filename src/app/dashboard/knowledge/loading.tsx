export default function KnowledgeLoading() {
  return (
    <div className="space-y-8 pb-10 mt-6 sm:mt-0 animate-pulse">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div className="space-y-2">
          <div className="h-10 w-56 bg-muted rounded-2xl" />
          <div className="h-4 w-80 bg-muted/60 rounded-xl" />
        </div>
        <div className="flex gap-3">
          <div className="h-12 w-12 bg-muted rounded-[20px]" />
          <div className="h-12 w-44 bg-muted rounded-[20px]" />
        </div>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="p-5 rounded-[24px] bg-muted/40 border border-border/20 flex items-center gap-4">
            <div className="w-12 h-12 rounded-[16px] bg-muted" />
            <div className="space-y-2">
              <div className="h-7 w-12 bg-muted rounded-lg" />
              <div className="h-2.5 w-24 bg-muted/60 rounded-full" />
            </div>
          </div>
        ))}
      </div>

      {/* Coverage matrix section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="h-6 w-44 bg-muted rounded-xl" />
          <div className="h-4 w-32 bg-muted/50 rounded-xl" />
        </div>

        {/* Level tabs + search */}
        <div className="flex flex-col xl:flex-row gap-4 xl:items-center justify-between">
          <div className="flex gap-2 p-1.5 bg-muted/30 border border-border/30 rounded-[24px] w-fit">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-9 w-28 bg-muted rounded-[18px]" />
            ))}
          </div>
          <div className="h-12 w-full xl:max-w-xs bg-muted/50 rounded-[20px]" />
        </div>

        {/* Level summary bar */}
        <div className="p-6 rounded-[32px] bg-muted/20 border border-border/20 flex items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="w-14 h-14 rounded-2xl bg-muted" />
            <div className="space-y-2">
              <div className="h-6 w-40 bg-muted rounded-xl" />
              <div className="h-3 w-56 bg-muted/60 rounded-full" />
            </div>
          </div>
          <div className="flex items-center gap-6">
            <div className="h-9 w-16 bg-muted rounded-xl" />
            <div className="w-32 h-3 bg-muted rounded-full" />
          </div>
        </div>

        {/* Grade cards grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-muted/20 border border-border/20 rounded-[32px] overflow-hidden">
              <div className="p-6 border-b border-border/20 flex items-center justify-between">
                <div className="h-6 w-24 bg-muted rounded-xl" />
                <div className="h-6 w-16 bg-muted/60 rounded-full" />
              </div>
              <div className="p-6 space-y-3">
                {Array.from({ length: 4 }).map((_, j) => (
                  <div key={j} className="h-12 rounded-[20px] bg-muted/40" />
                ))}
              </div>
              <div className="p-4">
                <div className="h-10 rounded-xl bg-muted/40" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Document list section */}
      <div className="space-y-5">
        <div className="h-7 w-52 bg-muted rounded-xl" />
        <div className="bg-card/40 rounded-[32px] border border-border/30 p-6 sm:p-8 space-y-6">
          {/* Search + filter */}
          <div className="flex flex-col gap-4">
            <div className="h-12 w-full max-w-sm bg-muted/50 rounded-[20px]" />
            <div className="flex gap-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-8 w-20 bg-muted/50 rounded-full" />
              ))}
            </div>
          </div>
          {/* Doc rows */}
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-5 p-5 rounded-[28px] bg-muted/20 border border-border/20">
              <div className="w-14 h-14 rounded-[20px] bg-muted shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-5 w-48 bg-muted rounded-lg" />
                <div className="h-3.5 w-64 bg-muted/60 rounded-full" />
              </div>
              <div className="hidden md:flex items-center gap-6">
                <div className="h-8 w-16 bg-muted rounded-lg" />
                <div className="h-7 w-20 bg-muted/60 rounded-full" />
                <div className="h-8 w-8 bg-muted/40 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
