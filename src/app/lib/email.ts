import { ResetCode, User } from "@generated/prisma";

// Email template function - put this in a separate file like emailTemplates.js
export function createPasswordResetEmail(user: User, resetCode: ResetCode) {
  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Password Reset</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: oklch(93.88% 0.033 300.19);">
      <div style="max-width: 600px; margin: 40px auto; background-color: oklch(100% 0 0); padding: 40px 30px; border: 2px solid oklch(0% 0 0); box-shadow: 4px 4px 0px 0px oklch(0% 0 0);">
        
        <!-- Header -->
        <div style="text-align: center; margin-bottom: 40px;">
          <h1 style="color: oklch(0% 0 0); margin: 0; font-size: 28px; font-weight: bold;">Password Reset</h1>
        </div>
        
        <!-- Greeting -->
        <div style="margin-bottom: 30px;">
          <p style="color: oklch(0% 0 0); font-size: 16px; line-height: 1.5; margin: 0;">
            Hi ${user.firstName},
          </p>
          <p style="color: oklch(0% 0 0); font-size: 16px; line-height: 1.5; margin: 15px 0 0 0;">
            You requested a password reset for your account. Use the code/link below to reset your password:
          </p>
        </div>
        
        <!-- Reset Code Box -->
        <div style="background-color: oklch(93.88% 0.033 300.19); border: 2px solid oklch(0% 0 0); border-radius: 0; padding: 30px; text-align: center; margin: 30px 0; box-shadow: 4px 4px 0px 0px oklch(0% 0 0);">
          <p style="color: oklch(0% 0 0); font-size: 14px; margin: 0 0 15px 0; text-transform: uppercase; letter-spacing: 1px; font-weight: bold;">
            Your Reset Code
          </p>
          <a href="https://www.classkudos.com/user/teacher-reset/${resetCode.code}" style="text-decoration: none; display: inline-block;">
            <div style="font-family: 'Courier New', Consolas, Monaco, monospace; font-size: 32px; font-weight: bold; color: oklch(70.28% 0.1753 295.36); letter-spacing: 3px; margin: 0; padding: 15px; background-color: oklch(100% 0 0); border: 2px solid oklch(0% 0 0); border-radius: 0; box-shadow: 2px 2px 0px 0px oklch(0% 0 0); cursor: pointer; transition: all 0.2s ease;">
              ${resetCode.code}
            </div>
          </a>
        </div>
        
        <!-- Instructions -->
        <div style="margin: 30px 0;">
          <p style="color: oklch(0% 0 0); font-size: 16px; line-height: 1.5; margin: 0;">
            Click the code above or <a href="https://www.classkudos.com/user/teacher-reset/${resetCode.code}" style="color: oklch(70.28% 0.1753 295.36); text-decoration: underline; font-weight: bold;">click here</a> to reset your password automatically.
          </p>
          <p style="color: oklch(0% 0 0); font-size: 14px; line-height: 1.5; margin: 15px 0 0 0; opacity: 0.7;">
            This code will expire on ${new Date(resetCode.expiresAt).toLocaleString()}.
          </p>
        </div>
        
        <!-- Security Notice -->
        <div style="background-color: #FACC00; border: 2px solid oklch(0% 0 0); padding: 15px; margin: 30px 0; border-radius: 0; box-shadow: 2px 2px 0px 0px oklch(0% 0 0);">
          <p style="color: oklch(0% 0 0); font-size: 14px; margin: 0; line-height: 1.4;">
            <strong>Security Notice:</strong> If you didn't request this password reset, please ignore this email. Your account remains secure.
          </p>
        </div>
        
        <!-- Footer -->
        <div style="margin-top: 40px; padding-top: 20px; border-top: 2px solid oklch(0% 0 0); text-align: center;">
          <p style="color: oklch(0% 0 0); font-size: 12px; margin: 0; opacity: 0.7;">
            This email was sent to ${user.email}
          </p>
          <p style="color: oklch(0% 0 0); font-size: 12px; margin: 10px 0 0 0; opacity: 0.7;">
            © 2025 Class Kudos. All rights reserved.
          </p>
        </div>
        
      </div>
    </body>
    </html>
  `;

  const text = `Hi ${user.firstName},

You requested a password reset for your account.

Your reset code: ${resetCode.code}

Enter this code on the password reset page to create a new password.

This code will expire on ${new Date(resetCode.expiresAt).toLocaleString()}.

If you didn't request this password reset, please ignore this email.

This email was sent to ${user.email}
© 2025 Acme. All rights reserved.`;

  return { html, text };
}

// Email API workaround (resend api needs node, crashes build)
//https://github.com/oscabriel/red-cloud/blob/main/src/lib/utils/email.ts
interface SendEmailParams {
  from: string;
  to: string;
  subject: string;
  html: string;
  text: string;
}

interface ResendEmailResponse {
  id: string;
}

interface ResendErrorResponse {
  message: string;
  name: string;
}

export async function sendEmail(
  params: SendEmailParams,
  apiKey: string,
): Promise<ResendEmailResponse> {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    let errorData: ResendErrorResponse;
    try {
      errorData = (await response.json()) as ResendErrorResponse;
    } catch {
      errorData = {
        message: "Unknown error",
        name: "ResendError",
      };
    }
    throw new Error(
      `Failed to send email: ${response.status} - ${errorData.message}`,
    );
  }

  const result = (await response.json()) as ResendEmailResponse;
  return result;
}