export default function DashboardLoading() {
  return (
    <div className="space-y-8 animate-pulse">
      <div className="h-32 rounded-2xl border border-border bg-surface-muted/50" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 rounded-xl border border-border bg-surface-muted/50" />
        ))}
      </div>
      <div className="h-48 rounded-xl border border-border bg-surface-muted/50" />
    </div>
  );
}
