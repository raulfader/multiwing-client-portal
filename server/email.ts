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
