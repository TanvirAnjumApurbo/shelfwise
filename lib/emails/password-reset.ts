type PasswordResetEmailParams = {
  fullName: string;
  code: string;
  expiresInMinutes: number;
};

export const getPasswordResetEmailTemplate = ({
  fullName,
  code,
  expiresInMinutes,
}: PasswordResetEmailParams) => {
  const safeName = fullName || "there";

  return `<!DOCTYPE html>
  <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>Password reset instructions</title>
      <style>
        :root {
          color-scheme: light;
        }
        body {
          margin: 0;
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          background-color: #f5f7fb;
          color: #1a1c23;
        }
        .wrapper {
          max-width: 560px;
          margin: 0 auto;
          padding: 32px 16px 48px;
        }
        .card {
          background-color: #ffffff;
          border-radius: 18px;
          box-shadow: 0 24px 48px rgba(31, 41, 55, 0.08);
          overflow: hidden;
        }
        .header {
          background: linear-gradient(135deg, #1e3a8a 0%, #312e81 100%);
          padding: 32px 28px;
          color: #f8fafc;
        }
        .header h1 {
          margin: 0;
          font-size: 24px;
          letter-spacing: 0.4px;
        }
        .content {
          padding: 32px 28px 40px;
        }
        .greeting {
          font-size: 18px;
          margin: 0 0 16px;
        }
        .message {
          margin: 0 0 24px;
          line-height: 1.6;
        }
        .code {
          display: inline-block;
          margin: 24px 0;
          padding: 16px 24px;
          font-size: 28px;
          letter-spacing: 8px;
          font-weight: 700;
          background-color: #0f172a;
          color: #f8fafc;
          border-radius: 12px;
        }
        .meta {
          margin: 24px 0 32px;
          font-size: 15px;
          color: #475569;
        }
        .cta {
          display: inline-block;
          padding: 12px 28px;
          background-color: #1d4ed8;
          border-radius: 999px;
          color: #eef2ff;
          text-decoration: none;
          font-weight: 600;
          letter-spacing: 0.3px;
        }
        .footer {
          margin-top: 32px;
          font-size: 13px;
          color: #94a3b8;
          line-height: 1.6;
        }
        .footer p {
          margin: 4px 0;
        }
        @media (max-width: 600px) {
          .code {
            font-size: 22px;
            letter-spacing: 6px;
          }
        }
      </style>
    </head>
    <body>
      <div class="wrapper">
        <div class="card">
          <div class="header">
            <h1>ShelfWise security checkpoint</h1>
          </div>
          <div class="content">
            <p class="greeting">Hi ${safeName},</p>
            <p class="message">
              We received a request to reset the password for your ShelfWise account. Use the verification code below to continue with your password reset.
            </p>
            <span class="code">${code}</span>
            <p class="meta">
              This code will expire in ${expiresInMinutes} minutes. To keep your account secure, do not share this code with anyone.
            </p>
            <p class="message">
              If you didn’t request this change, please ignore this email. Your current password will stay the same.
            </p>
            <p class="footer">
              With care,<br />
              The ShelfWise Security Team
            </p>
          </div>
        </div>
        <div class="footer">
          <p>
            You’re receiving this message because you asked to reset the password for your ShelfWise account.
          </p>
          <p>© ${new Date().getFullYear()} ShelfWise. All rights reserved.</p>
        </div>
      </div>
    </body>
  </html>`;
};
