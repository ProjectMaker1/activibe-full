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
  return `${FRONTEND_URL}/admin?tab=requests&campaignId=${encodeURIComponent(String(campaignId))}`;
}

export function buildCampaignModalLink(campaignId) {
  return `${FRONTEND_URL}/campaigns?open=${encodeURIComponent(String(campaignId))}`;
}

export function buildCampaignsListLink() {
  return `${FRONTEND_URL}/campaigns`;
}

/* -------------------- Presentation helpers -------------------- */

function escapeHtml(str) {
  return String(str ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function toFlagEmoji(countryCode) {
  const cc = String(countryCode || '').trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(cc)) return '';
  const A = 0x1f1e6;
  const codePoints = [...cc].map((ch) => A + (ch.charCodeAt(0) - 65));
  return String.fromCodePoint(...codePoints);
}

function countryName(countryCode, locale = 'en') {
  const cc = String(countryCode || '').trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(cc)) return '';
  try {
    const dn = new Intl.DisplayNames([locale], { type: 'region' });
    return dn.of(cc) || '';
  } catch {
    return '';
  }
}

function normalizeTopics(topics) {
  if (!Array.isArray(topics)) return [];
  const cleaned = topics.map((x) => String(x || '').trim()).filter(Boolean);

  const seen = new Set();
  const uniq = [];
  for (const t of cleaned) {
    const key = t.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      uniq.push(t);
    }
  }
  return uniq.slice(0, 8);
}

function renderPills(items) {
  if (!items?.length) return '';
  return `
    <div style="margin-top:10px">
      ${items
        .map(
          (t) => `
          <span style="
            display:inline-block;
            margin:0 8px 8px 0;
            padding:6px 10px;
            border-radius:999px;
            background:#F1F5F9;
            color:#0F172A;
            font-size:12px;
            border:1px solid #E2E8F0;
          ">${escapeHtml(t)}</span>
        `
        )
        .join('')}
    </div>
  `;
}

function shell({ title, subtitle, contentHtml, cta }) {
  const brand = 'ActiVibe';
  const primary = '#0c7b61';
  const bg = '#F6F7FB';
  const cardBorder = '#E5E7EB';
  const muted = '#64748B';

  return `
  <div style="background:${bg}; padding:28px 0; font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif; color:#0F172A;">
    <div style="max-width:640px; margin:0 auto; padding:0 16px;">

      <div style="margin-bottom:14px; display:flex; align-items:center; gap:10px;">
        <div>
          <div style="font-weight:800; font-size:14px; line-height:1.1;">${brand}</div>
          <div style="color:${muted}; font-size:12px;">Vibe of Activism</div>
        </div>
      </div>

      <div style="
        background:#fff;
        border:1px solid ${cardBorder};
        border-radius:16px;
        box-shadow:0 10px 30px rgba(15,23,42,0.06);
        overflow:hidden;
      ">
        <div style="padding:20px 20px 10px;">
          <div style="font-size:18px; font-weight:800; margin:0 0 6px;">${escapeHtml(title)}</div>
          ${
            subtitle
              ? `<div style="color:${muted}; font-size:13px; margin:0 0 12px;">${escapeHtml(
                  subtitle
                )}</div>`
              : ''
          }
        </div>

        <div style="padding:0 20px 18px;">
          ${contentHtml || ''}

          ${
            cta?.href
              ? `
            <div style="margin-top:18px;">
              <a href="${cta.href}" style="
                display:inline-block;
                padding:12px 16px;
                border-radius:12px;
                background:${primary};
                color:#fff !important;
                text-decoration:none;
                font-weight:700;
              ">${escapeHtml(cta.label || 'Open')}</a>
            </div>
            `
              : ''
          }

          ${
            cta?.hint
              ? `<div style="margin-top:10px; color:${muted}; font-size:12px;">${escapeHtml(
                  cta.hint
                )}</div>`
              : ''
          }
        </div>

        <div style="border-top:1px solid ${cardBorder}; padding:14px 20px; color:${muted}; font-size:12px;">
          If you didn’t request this, you can ignore this email.
        </div>
      </div>

      <div style="text-align:center; color:${muted}; font-size:12px; margin-top:14px;">
        © ${new Date().getFullYear()} ${brand}
      </div>

    </div>
  </div>
  `;
}

function keyValueRow(label, value) {
  if (!value) return '';
  return `
    <div style="display:flex; gap:10px; margin:6px 0;">
      <div style="min-width:92px; color:#64748B; font-size:13px;">${escapeHtml(label)}</div>
      <div style="font-size:13px; font-weight:600; color:#0F172A;">${escapeHtml(value)}</div>
    </div>
  `;
}

function heroImage(src, alt = 'ActiVibe') {
  if (!src) return '';
  return `
    <div style="padding:0 20px 16px;">
      <img
        src="${src}"
        alt="${escapeHtml(alt)}"
        width="600"
        style="max-width:100%; height:auto; display:block; border-radius:14px; border:1px solid #E2E8F0;"
      />
    </div>
  `;
}

/* -------------------- Emails -------------------- */

export async function sendNewCampaignToSupport({ campaignId, title, country, topics }) {
  mustEnv(process.env.RESEND_API_KEY, 'RESEND_API_KEY');

  const link = buildAdminRequestsLink(campaignId);

  const flag = toFlagEmoji(country);
  const cname = countryName(country, 'en');
  const topicPills = renderPills(normalizeTopics(topics));
  const topicsRow = topicPills
    ? `<div style="display:flex; gap:10px; margin:6px 0; align-items:flex-start;">
         <div style="min-width:92px; color:#64748B; font-size:13px;">Topics</div>
         <div>${topicPills}</div>
       </div>`
    : '';

  const subtitle = `A new campaign is waiting for review`;

  const contentHtml = `
    <div style="padding:14px 16px; border:1px solid #E2E8F0; border-radius:14px; background:#F8FAFC;">
      ${keyValueRow('Campaign ID', String(campaignId))}
      ${title ? keyValueRow('Title', title) : ''}
      ${country ? keyValueRow('Country', `${flag ? flag + ' ' : ''}${cname || country}`) : ''}
      ${topicsRow}
    </div>
  `;

  const subjectTitle = title ? title : `#${campaignId}`;
  const subjectCountry = country
    ? ` • ${toFlagEmoji(country) || ''}${countryName(country, 'en') ? ` ${countryName(country, 'en')}` : ''}`
    : '';
  const subject = `New campaign submission: ${subjectTitle}${subjectCountry}`;

  const html = shell({
    title: 'New campaign submitted',
    subtitle,
    contentHtml,
    cta: {
      href: link,
      label: 'Open Admin Requests',
      hint: 'If you are not logged in, you will be asked to log in first.',
    },
  });

  return resend.emails.send({
    from: `ActiVibe <${FROM_EMAIL}>`,
    to: [SUPPORT_EMAIL],
    subject,
    text: [
      `New campaign submitted`,
      ``,
      `ID: ${campaignId}`,
      title ? `Title: ${title}` : null,
      country ? `Country: ${country}` : null,
      Array.isArray(topics) && topics.length ? `Topics: ${normalizeTopics(topics).join(', ')}` : null,
      ``,
      `Open admin requests:`,
      link,
    ]
      .filter(Boolean)
      .join('\n'),
    html,
  });
}

export async function sendCampaignDecisionToUser({
  toEmail,
  campaignId,
  title,
  status,
  badges,
}) {
  mustEnv(process.env.RESEND_API_KEY, 'RESEND_API_KEY');

  const isApproved = status === 'APPROVED';
  const isRejected = status === 'REJECTED';

  const campaignLink = buildCampaignModalLink(campaignId);
  const campaignsListLink = buildCampaignsListLink();

  // ✅ badge image from your frontend public folder
  const badgeImgUrl = `${FRONTEND_URL}/badge.png`;

  const subject = isApproved
    ? 'Your campaign has been approved'
    : isRejected
    ? 'Your campaign has been rejected'
    : 'Campaign update';

  const subtitle = isApproved
    ? 'Thank you for contributing to ActiVibe.'
    : isRejected
    ? 'Thank you for your submission.'
    : 'Your campaign has been reviewed.';

  const badgesLine =
    typeof badges === 'number'
      ? `<div style="margin-top:10px; color:#0F172A; font-size:13px;">
           You now have <strong>${badges}</strong> badge${badges === 1 ? '' : 's'}.
         </div>`
      : '';

  const rejectHelp = `
    <div style="margin-top:10px; color:#64748B; font-size:13px;">
      If you’d like to understand the reason, please contact us at
      <a href="mailto:${SUPPORT_EMAIL}" style="color:#0c7b61; font-weight:700; text-decoration:none;">
        ${SUPPORT_EMAIL}
      </a>.
    </div>
  `;

  const approvedBody = `
    ${heroImage(badgeImgUrl, 'Badge')}
    <div style="padding:14px 16px; border:1px solid #E2E8F0; border-radius:14px; background:#F8FAFC;">
      ${keyValueRow('Status', 'Approved')}
      ${keyValueRow('Campaign', title || `#${campaignId}`)}
      <div style="margin-top:10px; color:#64748B; font-size:13px;">
        Your campaign is now visible on ActiVibe. You can open it using the button below.
      </div>
      ${badgesLine}
    </div>
  `;

  const rejectedBody = `
    <div style="padding:14px 16px; border:1px solid #E2E8F0; border-radius:14px; background:#F8FAFC;">
      ${keyValueRow('Status', 'Rejected')}
      ${keyValueRow('Campaign', title || `#${campaignId}`)}
      <div style="margin-top:10px; color:#64748B; font-size:13px;">
        Unfortunately, we’re not able to publish this campaign at this time.
      </div>
      ${rejectHelp}
    </div>
  `;

  const contentHtml = isApproved ? approvedBody : isRejected ? rejectedBody : `
    <div style="padding:14px 16px; border:1px solid #E2E8F0; border-radius:14px; background:#F8FAFC;">
      ${keyValueRow('Status', String(status || 'Updated'))}
      ${keyValueRow('Campaign', title || `#${campaignId}`)}
      <div style="margin-top:10px; color:#64748B; font-size:13px;">
        You can open the campaign using the button below.
      </div>
    </div>
  `;

  const cta = isRejected
    ? { href: campaignsListLink, label: 'View Campaigns' }
    : { href: campaignLink, label: 'View campaign' };

  const html = shell({
    title: isApproved ? 'Campaign approved' : isRejected ? 'Campaign rejected' : 'Campaign update',
    subtitle,
    contentHtml,
    cta,
  });

  const textLines = [
    isApproved ? 'Your campaign has been approved.' : isRejected ? 'Your campaign has been rejected.' : 'Your campaign has been updated.',
    `Campaign: ${title || `#${campaignId}`}`,
    typeof badges === 'number' && isApproved ? `You now have ${badges} badge${badges === 1 ? '' : 's'}.` : null,
    isRejected ? `For the reason, contact: ${SUPPORT_EMAIL}` : null,
    '',
    isRejected ? `View campaigns:` : `Open:`,
    isRejected ? campaignsListLink : campaignLink,
  ].filter(Boolean);

  return resend.emails.send({
    from: `ActiVibe <${FROM_EMAIL}>`,
    to: [toEmail],
    subject,
    text: textLines.join('\n'),
    html,
  });
}