type EmailLayoutParams = {
  title: string;
  preheader?: string;
  landlordName: string;
  landlordEmail?: string;
  bodyHtml: string;
  footerNote?: string;
};

export function renderEmailLayout(params: EmailLayoutParams): string {
  const preheader = params.preheader ?? params.title;
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(params.title)}</title>
</head>
<body style="margin:0;padding:0;background:#f8f7f2;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1e2328;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(preheader)}</div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f8f7f2;padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:620px;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e8e6e1;">
          <tr>
            <td style="background:linear-gradient(135deg,#1e2328 0%,#3d454d 100%);padding:24px 28px;">
              <p style="margin:0;font-size:12px;letter-spacing:0.08em;text-transform:uppercase;color:#c46b41;">Lessora</p>
              <h1 style="margin:8px 0 0;font-size:22px;line-height:1.3;color:#ffffff;">${escapeHtml(params.title)}</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:28px;">
              ${params.bodyHtml}
            </td>
          </tr>
          <tr>
            <td style="padding:0 28px 28px;">
              <div style="border-top:1px solid #e2e8f0;padding-top:20px;">
                <p style="margin:0 0 4px;font-size:14px;font-weight:600;color:#0f172a;">${escapeHtml(params.landlordName)}</p>
                ${params.landlordEmail ? `<p style="margin:0;font-size:13px;color:#64748b;">${escapeHtml(params.landlordEmail)}</p>` : ""}
                ${params.footerNote ? `<p style="margin:12px 0 0;font-size:12px;color:#94a3b8;">${escapeHtml(params.footerNote)}</p>` : ""}
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function emailInfoRow(label: string, value: string) {
  return `<tr>
    <td style="padding:10px 0;border-bottom:1px solid #f1f5f9;font-size:13px;color:#64748b;width:38%;vertical-align:top;">${escapeHtml(label)}</td>
    <td style="padding:10px 0;border-bottom:1px solid #f1f5f9;font-size:14px;color:#0f172a;font-weight:600;vertical-align:top;">${escapeHtml(value)}</td>
  </tr>`;
}

export function emailInfoTable(rows: string) {
  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:20px 0;background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;">
    <tr><td style="padding:16px 18px;">${rows}</td></tr>
  </table>`;
}

export function emailParagraph(text: string) {
  return `<p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#334155;">${escapeHtml(text)}</p>`;
}

export function emailButton(label: string, href: string) {
  return `<p style="margin:24px 0 8px;">
    <a href="${escapeHtml(href)}" style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;padding:12px 20px;border-radius:8px;">${escapeHtml(label)}</a>
  </p>`;
}

export function emailCallout(text: string, tone: "info" | "warning" = "info") {
  const colors =
    tone === "warning"
      ? { bg: "#fffbeb", border: "#fde68a", text: "#92400e" }
      : { bg: "#eff6ff", border: "#bfdbfe", text: "#1e40af" };
  return `<div style="margin:20px 0;padding:14px 16px;background:${colors.bg};border:1px solid ${colors.border};border-radius:10px;">
    <p style="margin:0;font-size:14px;line-height:1.6;color:${colors.text};">${escapeHtml(text)}</p>
  </div>`;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export { escapeHtml };
