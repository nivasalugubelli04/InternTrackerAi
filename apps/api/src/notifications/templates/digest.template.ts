/**
 * Phase 6 — Daily & Weekly Digest Email Template
 */

export interface DigestJob {
  title: string;
  company: string;
  location?: string | undefined;
  matchScore: number;
  deadline?: string | undefined;
  actionUrl?: string | undefined;
}

interface DigestEmailOptions {
  digestType: 'DAILY' | 'WEEKLY';
  period: string;
  jobs: DigestJob[];
  unsubscribeUrl?: string | undefined;
}

function buildJobRow(job: DigestJob, index: number): string {
  const scoreBg = job.matchScore >= 90 ? '#10b981' : job.matchScore >= 80 ? '#6366f1' : '#f59e0b';
  return `
    <tr style="${index > 0 ? 'border-top:1px solid #e2e8f0;' : ''}">
      <td style="padding:20px 0;">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td>
              <span style="background:${scoreBg};color:#fff;padding:3px 10px;border-radius:20px;font-size:12px;font-weight:600;">${job.matchScore}% Match</span>
              <h3 style="margin:8px 0 4px;color:#1e293b;font-size:16px;font-weight:600;">${job.title}</h3>
              <p style="margin:0;color:#6366f1;font-weight:500;font-size:14px;">${job.company}${job.location ? ` · ${job.location}` : ''}</p>
              ${job.deadline ? `<p style="margin:6px 0 0;color:#ef4444;font-size:12px;">⏰ ${job.deadline}</p>` : ''}
            </td>
            <td align="right" valign="middle" style="white-space:nowrap;">
              ${job.actionUrl ? `<a href="${job.actionUrl}" style="display:inline-block;padding:8px 18px;background:#6366f1;color:#fff;text-decoration:none;border-radius:6px;font-size:13px;font-weight:600;">Apply →</a>` : ''}
            </td>
          </tr>
        </table>
      </td>
    </tr>`;
}

export function buildDigestHtml(opts: DigestEmailOptions): string {
  const { digestType, period, jobs, unsubscribeUrl = '#' } = opts;

  const label = digestType === 'DAILY' ? '📅 Daily Digest' : '📆 Weekly Digest';
  const subtitle = `${jobs.length} new internship${jobs.length !== 1 ? 's' : ''} matched for you · ${period}`;

  const jobRows = jobs.map((j, i) => buildJobRow(j, i)).join('');

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${label}</title>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="640" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#6366f1,#8b5cf6);padding:32px 40px;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;">${label}</h1>
              <p style="margin:8px 0 0;color:rgba(255,255,255,0.85);font-size:14px;">${subtitle}</p>
            </td>
          </tr>

          <!-- Internship list -->
          <tr>
            <td style="padding:32px 40px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                ${jobRows}
              </table>
            </td>
          </tr>

          <!-- CTA -->
          <tr>
            <td style="padding:0 40px 32px;text-align:center;">
              <a href="#" style="display:inline-block;padding:12px 32px;background:#6366f1;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;font-size:15px;">
                View All Recommendations →
              </a>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f8fafc;padding:24px 40px;border-top:1px solid #e2e8f0;text-align:center;">
              <p style="margin:0;color:#94a3b8;font-size:12px;">
                <a href="${unsubscribeUrl}" style="color:#6366f1;">Manage digest preferences</a> · 
                <a href="${unsubscribeUrl}" style="color:#6366f1;">Unsubscribe</a>
              </p>
              <p style="margin:8px 0 0;color:#cbd5e1;font-size:11px;">
                © ${new Date().getFullYear()} InternTracker AI
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
