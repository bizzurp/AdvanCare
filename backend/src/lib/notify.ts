import type { Bindings } from '../env';
import { sendMail } from './mailer';

/**
 * Best-effort email to the family about their request (assignment, cancellation). Never fails
 * the staff action: a missing address or a mail error is logged and skipped.
 * Only first names and the request reference are included — no health details.
 */
export async function notifyFamily(
  env: Bindings,
  requestId: string,
  to: string | null | undefined,
  message: { subject: string; lines: string[] },
): Promise<'sent' | 'logged' | 'skipped'> {
  if (!to) return 'skipped';
  try {
    return await sendMail(
      env,
      {
        to,
        subject: message.subject,
        text: `${message.lines.join('\n')}\n\nOpen the AdvanCare app to see the details.\n— AdvanCare`,
        html: `<div style="font-family:Arial,sans-serif;color:#173e37;max-width:460px">${message.lines.map((l) => `<p>${escapeHtml(l)}</p>`).join('')}<p style="color:#536d65;font-size:13px">Open the AdvanCare app to see the details.</p></div>`,
      },
      requestId,
    );
  } catch {
    return 'skipped';
  }
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]!);
}
