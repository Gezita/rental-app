export default function DashboardLoading() {
  return (
    <div className="space-y-8 animate-pulse">
      <div className="h-36 rounded-2xl border border-border bg-surface shadow-[var(--shadow-sm)]" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="h-28 rounded-2xl border border-border bg-surface shadow-[var(--shadow-sm)]"
          />
        ))}
      </div>
      <div className="h-52 rounded-2xl border border-border bg-surface shadow-[var(--shadow-sm)]" />
    </div>
  );
}
