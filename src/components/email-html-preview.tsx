"use client";

type EmailHtmlPreviewProps = {
  html: string;
  subject: string;
};

export function EmailHtmlPreview({ html, subject }: EmailHtmlPreviewProps) {
  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-border bg-surface-muted/40 px-4 py-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted">Subject</p>
        <p className="mt-1 text-sm font-medium text-foreground">{subject}</p>
      </div>
      <div className="overflow-hidden rounded-xl border border-border bg-white shadow-sm">
        <iframe
          title="Email preview"
          srcDoc={html}
          className="h-[520px] w-full border-0"
          sandbox=""
        />
      </div>
    </div>
  );
}
