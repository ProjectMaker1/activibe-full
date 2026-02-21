// backend/src/services/emailService.js
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

const FRONTEND_URL = (process.env.FRONTEND_URL || 'https://activibe.net').replace(/\/$/, '');
const FROM_EMAIL = process.env.MAIL_FROM || 'support@activibe.net';
const SUPPORT_EMAIL = process.env.SUPPORT_EMAIL || 'support@activibe.net';

function mustEnv(v, name) {
  if (!v) {
    const err = new Error(`Missing env: ${name}`);
    err.status = 500;
    throw err;
  }
}

export function buildAdminRequestsLink(campaignId) {
  // შენს ფრონტში რომ იმუშაოს, დავტოვოთ მარტივი და სტაბილური:
  // /admin -> თუ არაა ავტორიზებული, frontend თავად გადააგდებს login-ზე
  // campaignId-საც ვუწერთ query-ით, რომ მერე შეიძლება ფილტრი/ჰაილაითი გააკეთო.
  return `${FRONTEND_URL}/admin?tab=requests&campaignId=${encodeURIComponent(String(campaignId))}`;
}

export function buildCampaignModalLink(campaignId) {
  // Campaigns page-ზე query param open=ID -> modal გახსნას შენ frontend-ში დავამატებთ შემდეგ ნაბიჯში
  return `${FRONTEND_URL}/campaigns?open=${encodeURIComponent(String(campaignId))}`;
}

export async function sendNewCampaignToSupport({ campaignId, title }) {
  mustEnv(process.env.RESEND_API_KEY, 'RESEND_API_KEY');

  const link = buildAdminRequestsLink(campaignId);

  return resend.emails.send({
    from: `ActiVibe <${FROM_EMAIL}>`,
    to: [SUPPORT_EMAIL],
    subject: `New campaign submission: ${title || `#${campaignId}`}`,
    text: `A new campaign was submitted.\n\nCampaign ID: ${campaignId}\nTitle: ${title || ''}\n\nOpen admin requests:\n${link}\n`,
    html: `
      <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;line-height:1.5">
        <h2 style="margin:0 0 12px">New campaign submitted</h2>
        <p style="margin:0 0 8px"><b>ID:</b> ${campaignId}</p>
        ${title ? `<p style="margin:0 0 16px"><b>Title:</b> ${escapeHtml(title)}</p>` : ''}
        <p style="margin:0 0 16px">
          <a href="${link}" style="display:inline-block;padding:10px 14px;border-radius:10px;background:#0c7b61;color:#fff;text-decoration:none">
            Open in Admin Panel
          </a>
        </p>
        <p style="margin:0;color:#6b7280;font-size:12px">If you are not logged in, you will be asked to log in first.</p>
      </div>
    `,
  });
}

export async function sendCampaignDecisionToUser({ toEmail, campaignId, title, status }) {
  mustEnv(process.env.RESEND_API_KEY, 'RESEND_API_KEY');

  const link = buildCampaignModalLink(campaignId);

  const pretty =
    status === 'APPROVED' ? 'approved ✅' :
    status === 'REJECTED' ? 'rejected ❌' :
    status;

  return resend.emails.send({
    from: `ActiVibe <${FROM_EMAIL}>`,
    to: [toEmail],
    subject: `Your campaign was ${pretty}`,
    text: `Your campaign was ${pretty}.\n\nCampaign: ${title || `#${campaignId}`}\nOpen:\n${link}\n`,
    html: `
      <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;line-height:1.5">
        <h2 style="margin:0 0 12px">Campaign update</h2>
        <p style="margin:0 0 8px">Your campaign was <b>${escapeHtml(pretty)}</b>.</p>
        <p style="margin:0 0 8px"><b>Campaign:</b> ${escapeHtml(title || `#${campaignId}`)}</p>
        <p style="margin:16px 0">
          <a href="${link}" style="display:inline-block;padding:10px 14px;border-radius:10px;background:#0c7b61;color:#fff;text-decoration:none">
            View campaign
          </a>
        </p>
      </div>
    `,
  });
}

function escapeHtml(str) {
  return String(str)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}