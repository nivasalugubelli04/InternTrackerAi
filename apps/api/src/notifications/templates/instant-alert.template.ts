/**
 * Phase 6 — Instant Alert Email Template
 * Clean, professional HTML email for a single internship match.
 */

interface InstantAlertOptions {
  title: string;
  message: string;
  actionUrl?: string | undefined;
  companyName?: string | undefined;
  matchScore?: number | undefined;
  deadline?: string | undefined;
}

export function buildInstantAlertHtml(opts: InstantAlertOptions): string {
  const { title, message, actionUrl, companyName, matchScore, deadline } = opts;

  const badgeHtml = matchScore
    ? `<span style="background:#6366f1;color:#fff;padding:4px 12px;border-radius:20px;font-size:13px;font-weight:600;">${matchScore}% Match</span>`
    : '';

  const deadlineHtml = deadline
    ? `<p style="color:#ef4444;font-size:13px;margin:8px 0 0;">⏰ Deadline: ${deadline}</p>`
    : '';

  const buttonHtml = actionUrl
    ? `<a href="${actionUrl}" style="display:inline-block;margin-top:24px;padding:12px 28px;background:#6366f1;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;font-size:15px;">View Internship →</a>`
    : '';

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#6366f1,#8b5cf6);padding:32px 40px;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;letter-spacing:-0.5px;">
                🎯 InternTracker AI
              </h1>
              <p style="margin:8px 0 0;color:rgba(255,255,255,0.85);font-size:14px;">
                Your personalised internship alert
              </p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:40px;">
              <div style="margin-bottom:16px;">${badgeHtml}</div>
              <h2 style="margin:0 0 12px;color:#1e293b;font-size:20px;font-weight:700;">${title}</h2>
              ${companyName ? `<p style="margin:0 0 8px;color:#6366f1;font-weight:600;font-size:15px;">@ ${companyName}</p>` : ''}
              <p style="margin:16px 0;color:#475569;font-size:15px;line-height:1.6;">${message}</p>
              ${deadlineHtml}
              ${buttonHtml}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f8fafc;padding:24px 40px;border-top:1px solid #e2e8f0;text-align:center;">
              <p style="margin:0;color:#94a3b8;font-size:12px;">
                You received this because you have internship alerts enabled.
                <br />
                <a href="#" style="color:#6366f1;">Manage preferences</a> · 
                <a href="#" style="color:#6366f1;">Unsubscribe</a>
              </p>
              <p style="margin:8px 0 0;color:#cbd5e1;font-size:11px;">
                © ${new Date().getFullYear()} InternTracker AI — Powered by AI
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
