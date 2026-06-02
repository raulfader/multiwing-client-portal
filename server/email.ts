import nodemailer from "nodemailer";

// ── SMTP transporter ──────────────────────────────────────────────────────────
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export async function verifySMTP(): Promise<boolean> {
  try {
    await transporter.verify();
    return true;
  } catch {
    return false;
  }
}

// ── Branded HTML email template ───────────────────────────────────────────────
const FL_LOGO =
  "https://d2xsxph8kpxj0f.cloudfront.net/310519663488436824/iLXUQ5XAKoVQ9DttVq4BTX/faderlabs-logo-white_d7a18ec8.png";

const PORTAL_BASE_URL = "https://multiwing.faderlabs.ai";

export function buildProjectNotificationEmail(params: {
  firstName: string;
  projectTitle: string;
  projectUrl: string;
  subject: string;
  customMessage?: string;
  trackingToken?: string;
}): { html: string; text: string } {
  const { firstName, projectTitle, projectUrl, customMessage, trackingToken } = params;

  // Build tracking URLs if a token is provided
  const trackedProjectUrl = trackingToken
    ? `${PORTAL_BASE_URL}/api/track/click/${trackingToken}?url=${encodeURIComponent(projectUrl)}`
    : projectUrl;
  const openPixelUrl = trackingToken
    ? `${PORTAL_BASE_URL}/api/track/open/${trackingToken}`
    : null;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>${params.subject}</title>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet" />
  <style>
    body { margin: 0; padding: 0; background: #0a0a0a; font-family: 'Plus Jakarta Sans', 'DM Sans', 'Helvetica Neue', Helvetica, Arial, sans-serif; }
    .wrapper { max-width: 600px; margin: 0 auto; background: #111111; }
    .header { background: #0a0a0a; padding: 32px 40px 24px; border-bottom: 1px solid #222; text-align: center; }
    .header img { height: 36px; display: block; margin: 0 auto; }
    .body { padding: 40px 40px 32px; }
    .greeting { font-size: 15px; font-weight: 400; color: #ffffff; margin: 0 0 16px; font-family: 'Plus Jakarta Sans', 'DM Sans', 'Helvetica Neue', Helvetica, Arial, sans-serif; }
    .message { font-size: 15px; line-height: 1.7; color: #cccccc; margin: 0 0 28px; }
    .cta-block { background: #1a1a1a; border: 1px solid #2a2a2a; border-radius: 12px; padding: 24px 28px; margin-bottom: 28px; }
    .cta-label { font-size: 11px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; color: #FFD600; margin: 0 0 8px; }
    .cta-title { font-size: 18px; font-weight: 700; color: #ffffff; margin: 0 0 16px; }
    .cta-btn { display: inline-block; background: #FFD600; color: #0a0a0a; font-size: 14px; font-weight: 700; text-decoration: none; padding: 12px 28px; border-radius: 8px; letter-spacing: 0.04em; }
    .credentials { background: #161616; border: 1px solid #2a2a2a; border-radius: 8px; padding: 16px 20px; margin-bottom: 28px; }
    .cred-row { display: flex; align-items: center; gap: 12px; margin-bottom: 8px; }
    .cred-row:last-child { margin-bottom: 0; }
    .cred-label { font-size: 11px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: #666; min-width: 80px; }
    .cred-value { font-size: 14px; color: #ffffff; font-family: 'Courier New', monospace; }
    .footer { background: #0a0a0a; padding: 24px 40px; border-top: 1px solid #222; text-align: center; }
    .footer p { font-size: 12px; color: #555; margin: 0 0 4px; }
    .footer a { color: #FFD600; text-decoration: none; }
  </style>
</head>
<body>
  <div class="wrapper">
    <!-- Header -->
    <div class="header">
      <img src="${FL_LOGO}" alt="Faderlabs" />
    </div>

    <!-- Body -->
    <div class="body">
      <p class="greeting">Hi ${firstName},</p>

      <p class="message">
        ${customMessage
          ? customMessage
          : `We're excited to let you know that <strong style="color:#ffffff;">${projectTitle}</strong> is now ready for your review. Please click the button below to access your project portal and share your feedback.`
        }
      </p>

      <!-- CTA -->
      <div class="cta-block">
        <p class="cta-label">Your Project</p>
        <p class="cta-title">${projectTitle}</p>
        <a href="${trackedProjectUrl}" class="cta-btn">View Project &rarr;</a>
      </div>

      <!-- Login credentials -->
      <div class="credentials">
        <div class="cred-row">
          <span class="cred-label">Portal</span>
          <span class="cred-value"><a href="${trackedProjectUrl}" style="color:#FFD600;text-decoration:none;">${projectUrl}</a></span>
        </div>
        <div class="cred-row">
          <span class="cred-label">Password</span>
          <span class="cred-value">MW@2025</span>
        </div>
      </div>

      <p class="message" style="font-size:13px;color:#888;">
        If you have any questions or need assistance, simply reply to this email and we'll get back to you promptly.
      </p>
    </div>

    <!-- Footer -->
    <div class="footer">
      <p>Faderlabs &mdash; <a href="https://faderlabs.com">faderlabs.com</a></p>
      <p>This email was sent on behalf of the Faderlabs production team.</p>
    </div>
  </div>
  ${openPixelUrl ? `<img src="${openPixelUrl}" width="1" height="1" alt="" style="display:block;border:0;" />` : ""}
</body>
</html>`;

  const text = `Hi ${firstName},

${customMessage ?? `${projectTitle} is now ready for your review.`}

View your project: ${projectUrl}

Login password: MW@2025

If you have any questions, reply to this email.

— Faderlabs Team`;

  return { html, text };
}

// ── Send a single notification email ─────────────────────────────────────────
export async function sendProjectNotification(params: {
  to: string;
  firstName: string;
  projectTitle: string;
  projectUrl: string;
  subject: string;
  customMessage?: string;
  trackingToken?: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const { html, text } = buildProjectNotificationEmail(params);
    await transporter.sendMail({
      from: `"Faderlabs" <${process.env.SMTP_USER}>`,
      to: params.to,
      subject: params.subject,
      html,
      text,
    });
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message ?? "Unknown error" };
  }
}

// ── Share invite email (no OTP — just a link) ───────────────────────────────
export async function sendShareInviteEmail(params: {
  to: string;
  projectTitle: string;
  accessLevel: "read" | "download";
  shareUrl: string;
}): Promise<{ success: boolean; error?: string }> {
  const { to, projectTitle, accessLevel, shareUrl } = params;
  const accessLabel = accessLevel === "download" ? "view and download files" : "view deliverables";

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>You've been invited to a project</title>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet" />
  <style>
    body { margin: 0; padding: 0; background: #0a0a0a; font-family: 'Plus Jakarta Sans', 'Helvetica Neue', Arial, sans-serif; }
    .wrapper { max-width: 600px; margin: 0 auto; background: #111111; }
    .header { background: #0a0a0a; padding: 32px 40px 24px; border-bottom: 1px solid #222; text-align: center; }
    .header img { height: 36px; display: block; margin: 0 auto; }
    .body { padding: 40px 40px 32px; }
    .greeting { font-size: 15px; color: #ffffff; margin: 0 0 16px; }
    .message { font-size: 15px; line-height: 1.7; color: #cccccc; margin: 0 0 28px; }
    .cta-block { background: #1a1a1a; border: 1px solid #2a2a2a; border-radius: 12px; padding: 24px 28px; margin-bottom: 28px; text-align: center; }
    .cta-label { font-size: 11px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; color: #FFD600; margin: 0 0 8px; }
    .cta-title { font-size: 18px; font-weight: 700; color: #ffffff; margin: 0 0 20px; }
    .cta-btn { display: inline-block; background: #FFD600; color: #0a0a0a; font-size: 14px; font-weight: 700; text-decoration: none; padding: 14px 32px; border-radius: 8px; letter-spacing: 0.04em; }
    .footer { background: #0a0a0a; padding: 24px 40px; border-top: 1px solid #222; text-align: center; }
    .footer p { font-size: 12px; color: #555; margin: 0 0 4px; }
    .footer a { color: #FFD600; text-decoration: none; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header"><img src="${FL_LOGO}" alt="Faderlabs" /></div>
    <div class="body">
      <p class="greeting">Hi there,</p>
      <p class="message">
        You've been invited to ${accessLabel} for the project <strong style="color:#fff;">${projectTitle}</strong>.
        Click the button below to access the project. You'll be asked to verify your email address when you arrive.
      </p>
      <div class="cta-block">
        <p class="cta-label">Your Project</p>
        <p class="cta-title">${projectTitle}</p>
        <a href="${shareUrl}" class="cta-btn">Open Project Portal &rarr;</a>
      </div>
      <p class="message" style="font-size:13px;color:#888;">
        If you didn't expect this invitation, you can safely ignore this email.
      </p>
    </div>
    <div class="footer">
      <p>Faderlabs &mdash; <a href="https://faderlabs.com">faderlabs.com</a></p>
      <p>This email was sent on behalf of the Faderlabs production team.</p>
    </div>
  </div>
</body>
</html>`;

  const text = `Hi there,

You've been invited to ${accessLabel} for the project "${projectTitle}".

Click the link below to access the project. You'll be asked to verify your email address when you arrive.

${shareUrl}

If you didn't expect this, you can safely ignore this email.

— Faderlabs Team`;

  try {
    await transporter.sendMail({
      from: `"Faderlabs" <${process.env.SMTP_USER}>`,
      to,
      subject: `You've been invited to view "${projectTitle}"`,
      html,
      text,
    });
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message ?? "Unknown error" };
  }
}

// ── Share OTP email ───────────────────────────────────────────────────────────
export async function sendShareOtpEmail(params: {
  to: string;
  projectTitle: string;
  code: string;
  accessLevel: "read" | "download";
  shareUrl: string;
}): Promise<{ success: boolean; error?: string }> {
  const { to, projectTitle, code, accessLevel, shareUrl } = params;
  const accessLabel = accessLevel === "download" ? "view and download files" : "view deliverables";

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Your verification code</title>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet" />
  <style>
    body { margin: 0; padding: 0; background: #0a0a0a; font-family: 'Plus Jakarta Sans', 'Helvetica Neue', Arial, sans-serif; }
    .wrapper { max-width: 600px; margin: 0 auto; background: #111111; }
    .header { background: #0a0a0a; padding: 32px 40px 24px; border-bottom: 1px solid #222; text-align: center; }
    .header img { height: 36px; display: block; margin: 0 auto; }
    .body { padding: 40px 40px 32px; }
    .greeting { font-size: 15px; color: #ffffff; margin: 0 0 16px; }
    .message { font-size: 15px; line-height: 1.7; color: #cccccc; margin: 0 0 28px; }
    .otp-block { background: #1a1a1a; border: 1px solid #2a2a2a; border-radius: 12px; padding: 28px; margin-bottom: 28px; text-align: center; }
    .otp-label { font-size: 11px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; color: #FFD600; margin: 0 0 12px; }
    .otp-code { font-size: 42px; font-weight: 900; letter-spacing: 0.2em; color: #FFD600; font-family: 'Courier New', monospace; margin: 0 0 12px; }
    .otp-expiry { font-size: 12px; color: #666; margin: 0; }
    .cta-btn { display: inline-block; background: #FFD600; color: #0a0a0a; font-size: 14px; font-weight: 700; text-decoration: none; padding: 12px 28px; border-radius: 8px; letter-spacing: 0.04em; }
    .footer { background: #0a0a0a; padding: 24px 40px; border-top: 1px solid #222; text-align: center; }
    .footer p { font-size: 12px; color: #555; margin: 0 0 4px; }
    .footer a { color: #FFD600; text-decoration: none; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header"><img src="${FL_LOGO}" alt="Faderlabs" /></div>
    <div class="body">
      <p class="greeting">Hi there,</p>
      <p class="message">
        You've been invited to ${accessLabel} for the project <strong style="color:#fff;">${projectTitle}</strong>.
        Enter the verification code below to access the project.
      </p>
      <div class="otp-block">
        <p class="otp-label">Your verification code</p>
        <p class="otp-code">${code}</p>
        <p class="otp-expiry">This code expires in 15 minutes</p>
      </div>
      <p style="text-align:center;margin-bottom:28px;">
        <a href="${shareUrl}" class="cta-btn">Open Project Portal &rarr;</a>
      </p>
      <p class="message" style="font-size:13px;color:#888;">
        If you didn't request this, you can safely ignore this email.
      </p>
    </div>
    <div class="footer">
      <p>Faderlabs &mdash; <a href="https://faderlabs.com">faderlabs.com</a></p>
      <p>This email was sent on behalf of the Faderlabs production team.</p>
    </div>
  </div>
</body>
</html>`;

  const text = `Hi there,

You've been invited to ${accessLabel} for the project "${projectTitle}".

Your verification code: ${code}

This code expires in 15 minutes.

Open the project portal: ${shareUrl}

If you didn't request this, you can safely ignore this email.

— Faderlabs Team`;

  try {
    await transporter.sendMail({
      from: `"Faderlabs" <${process.env.SMTP_USER}>`,
      to,
      subject: `Your access code for "${projectTitle}"`,
      html,
      text,
    });
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message ?? "Unknown error" };
  }
}

// ── Admin alert email (comment / download notifications) ─────────────────────
export async function sendAdminAlertEmail(params: {
  subject: string;
  heading: string;
  lines: string[];
}): Promise<{ success: boolean; error?: string }> {
  const { subject, heading, lines } = params;

  const rowsHtml = lines
    .map((l) => `<p style="margin:0 0 10px;font-size:14px;line-height:1.6;color:#cccccc;">${l}</p>`)
    .join("\n");

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>${subject}</title>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet" />
  <style>
    body { margin:0;padding:0;background:#0a0a0a;font-family:'Plus Jakarta Sans','Helvetica Neue',Arial,sans-serif; }
    .wrapper { max-width:600px;margin:0 auto;background:#111111; }
    .header { background:#0a0a0a;padding:28px 40px 20px;border-bottom:1px solid #222;text-align:center; }
    .header img { height:32px;display:block;margin:0 auto; }
    .body { padding:36px 40px 28px; }
    .heading { font-size:18px;font-weight:700;color:#ffffff;margin:0 0 20px; }
    .card { background:#1a1a1a;border:1px solid #2a2a2a;border-radius:10px;padding:20px 24px;margin-bottom:24px; }
    .footer { background:#0a0a0a;padding:20px 40px;border-top:1px solid #222;text-align:center; }
    .footer p { font-size:12px;color:#555;margin:0 0 4px; }
    .footer a { color:#FFD600;text-decoration:none; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header"><img src="${FL_LOGO}" alt="Faderlabs" /></div>
    <div class="body">
      <p class="heading">${heading}</p>
      <div class="card">${rowsHtml}</div>
      <p style="font-size:12px;color:#555;margin:0;">This is an automated notification from the Faderlabs portal.</p>
    </div>
    <div class="footer">
      <p>Faderlabs &mdash; <a href="https://faderlabs.com">faderlabs.com</a></p>
    </div>
  </div>
</body>
</html>`;

  const text = `${heading}\n\n${lines.map((l) => l.replace(/<[^>]+>/g, "")).join("\n")}\n\n— Faderlabs`;

  try {
    await transporter.sendMail({
      from: `"Faderlabs" <hello@faderlabs.com>`,
      to: "raul@faderlabs.com",
      subject,
      html,
      text,
    });
    return { success: true };
  } catch (err: any) {
    console.error("[admin-alert-email] failed:", err?.message);
    return { success: false, error: err?.message ?? "Unknown error" };
  }
}

// ── 6-hour activity digest email ──────────────────────────────────────────────
export async function sendDigestEmail(params: {
  periodLabel: string; // e.g. "6:00 AM – 12:00 PM EST"
  comments: Array<{ subject: string; detail: string | null; createdAt: Date }>;
  downloads: Array<{ subject: string; detail: string | null; createdAt: Date }>;
}): Promise<{ success: boolean; error?: string }> {
  const { periodLabel, comments, downloads } = params;

  const totalEvents = comments.length + downloads.length;
  if (totalEvents === 0) return { success: true }; // nothing to send

  const formatTime = (d: Date) =>
    d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", timeZone: "America/New_York" });

  // Build event rows for a section table
  const buildRows = (items: typeof comments) =>
    items
      .map(
        (item) => `
        <tr>
          <td style="padding:10px 14px;border-bottom:1px solid #1e1e1e;font-size:13px;color:#ffffff;font-weight:600;vertical-align:top;">${item.subject}</td>
          <td style="padding:10px 14px;border-bottom:1px solid #1e1e1e;font-size:13px;color:#aaaaaa;vertical-align:top;">${item.detail ?? ""}</td>
          <td style="padding:10px 14px;border-bottom:1px solid #1e1e1e;font-size:12px;color:#555555;white-space:nowrap;vertical-align:top;">${formatTime(item.createdAt)}</td>
        </tr>`
      )
      .join("\n");

  // Section block: yellow pill label + dark card table
  const buildSection = (label: string, accentColor: string, items: typeof comments) => `
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
      <tr>
        <td>
          <!-- Section label pill -->
          <table cellpadding="0" cellspacing="0" style="margin-bottom:12px;">
            <tr>
              <td style="background:${accentColor}22;border:1px solid ${accentColor}55;border-radius:20px;padding:3px 12px;">
                <span style="font-size:11px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:${accentColor};font-family:'Plus Jakarta Sans','Helvetica Neue',Arial,sans-serif;">${label} &nbsp;(${items.length})</span>
              </td>
            </tr>
          </table>
          <!-- Table card -->
          <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;background:#161616;border:1px solid #2a2a2a;border-radius:10px;overflow:hidden;">
            <thead>
              <tr style="background:#1a1a1a;">
                <th style="padding:8px 14px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#555;text-align:left;border-bottom:1px solid #2a2a2a;">Subject</th>
                <th style="padding:8px 14px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#555;text-align:left;border-bottom:1px solid #2a2a2a;">Detail</th>
                <th style="padding:8px 14px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#555;text-align:left;border-bottom:1px solid #2a2a2a;">Time (ET)</th>
              </tr>
            </thead>
            <tbody>${buildRows(items)}</tbody>
          </table>
        </td>
      </tr>
    </table>`;

  const commentsSection = comments.length > 0
    ? buildSection("Comments", "#FFD600", comments)
    : "";

  const downloadsSection = downloads.length > 0
    ? buildSection("Downloads", "#4ADE80", downloads)
    : "";

  // Inline logo: "Faderlabs" text + three colored squares (matches portal header)
  const logoHtml = `
    <table cellpadding="0" cellspacing="0" style="margin:0 auto;">
      <tr>
        <td style="font-family:'Plus Jakarta Sans','Helvetica Neue',Arial,sans-serif;font-size:26px;font-weight:700;color:#ffffff;letter-spacing:-0.02em;vertical-align:middle;">Faderlabs</td>
        <td width="10"></td>
        <td style="vertical-align:middle;">
          <table cellpadding="0" cellspacing="0">
            <tr>
              <td style="width:18px;height:18px;background:#4ADE80;border-radius:3px;"></td>
              <td width="5"></td>
              <td style="width:18px;height:18px;background:#FFD600;border-radius:3px;"></td>
              <td width="5"></td>
              <td style="width:18px;height:18px;background:#EF4444;border-radius:3px;"></td>
            </tr>
          </table>
        </td>
      </tr>
    </table>`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Portal Activity Digest</title>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet" />
</head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:'Plus Jakarta Sans','Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#111111;border-radius:16px;overflow:hidden;border:1px solid #222222;">

        <!-- ── HEADER ── -->
        <tr>
          <td style="background:#0a0a0a;padding:28px 40px 24px;border-bottom:1px solid #222222;text-align:center;">
            ${logoHtml}
            <!-- CONTENT HUB pill -->
            <table cellpadding="0" cellspacing="0" style="margin:14px auto 0;">
              <tr>
                <td style="border:1px solid #FFD60066;border-radius:20px;padding:4px 14px;">
                  <span style="font-size:10px;font-weight:700;letter-spacing:0.15em;text-transform:uppercase;color:#FFD600;font-family:'Plus Jakarta Sans','Helvetica Neue',Arial,sans-serif;">CONTENT HUB</span>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- ── BODY ── -->
        <tr>
          <td style="padding:36px 40px 28px;">

            <!-- Summary bar -->
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#1a1a1a;border:1px solid #2a2a2a;border-radius:10px;margin-bottom:28px;">
              <tr>
                <td style="padding:16px 20px;">
                  <p style="margin:0 0 4px;font-size:11px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#FFD600;font-family:'Plus Jakarta Sans','Helvetica Neue',Arial,sans-serif;">Activity Digest</p>
                  <p style="margin:0;font-size:15px;font-weight:600;color:#ffffff;font-family:'Plus Jakarta Sans','Helvetica Neue',Arial,sans-serif;">${totalEvents} event${totalEvents !== 1 ? "s" : ""} &mdash; <span style="color:#888;font-weight:400;font-size:13px;">${periodLabel}</span></p>
                </td>
              </tr>
            </table>

            ${commentsSection}
            ${downloadsSection}

            <!-- CTA button -->
            <table cellpadding="0" cellspacing="0" style="margin:8px 0 24px;">
              <tr>
                <td style="background:#FFD600;border-radius:8px;">
                  <a href="https://multiwing.faderlabs.ai" style="display:inline-block;padding:12px 28px;font-size:14px;font-weight:700;color:#0a0a0a;text-decoration:none;font-family:'Plus Jakarta Sans','Helvetica Neue',Arial,sans-serif;letter-spacing:0.03em;">Open Portal &rarr;</a>
                </td>
              </tr>
            </table>

            <p style="margin:0;font-size:12px;color:#444444;font-family:'Plus Jakarta Sans','Helvetica Neue',Arial,sans-serif;">This digest is sent every 6 hours when there is portal activity. No activity = no email.</p>
          </td>
        </tr>

        <!-- ── FOOTER ── -->
        <tr>
          <td style="background:#0a0a0a;padding:20px 40px;border-top:1px solid #222222;text-align:center;">
            <p style="margin:0 0 4px;font-size:12px;color:#444444;font-family:'Plus Jakarta Sans','Helvetica Neue',Arial,sans-serif;">Faderlabs &mdash; <a href="https://faderlabs.com" style="color:#FFD600;text-decoration:none;">faderlabs.com</a></p>
            <p style="margin:0;font-size:11px;color:#333333;font-family:'Plus Jakarta Sans','Helvetica Neue',Arial,sans-serif;">Sent to raul@faderlabs.com &middot; Faderlabs Content Hub</p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;

  const textLines = [
    `Faderlabs Content Hub — Activity Digest`,
    `${totalEvents} event(s) — ${periodLabel}`,
    "",
    ...(comments.length > 0
      ? [`COMMENTS (${comments.length})`, ...comments.map((c) => `  [${formatTime(c.createdAt)}] ${c.subject}: ${c.detail ?? ""}`), ""]
      : []),
    ...(downloads.length > 0
      ? [`DOWNLOADS (${downloads.length})`, ...downloads.map((d) => `  [${formatTime(d.createdAt)}] ${d.subject}: ${d.detail ?? ""}`), ""]
      : []),
    `Open portal: https://multiwing.faderlabs.ai`,
    "",
    "— Faderlabs",
  ];

  try {
    await transporter.sendMail({
      from: `"Faderlabs" <hello@faderlabs.com>`,
      to: "raul@faderlabs.com",
      subject: `Faderlabs Portal — ${totalEvents} event${totalEvents !== 1 ? "s" : ""} (${periodLabel})`,
      html,
      text: textLines.join("\n"),
    });
    return { success: true };
  } catch (err: any) {
    console.error("[digest-email] failed:", err?.message);
    return { success: false, error: err?.message ?? "Unknown error" };
  }
}
