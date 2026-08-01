import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

import type { AppConfig } from '../config/configuration';

/**
 * EmailService handles transactional email delivery.
 *
 * Architectural Decision:
 *  - Uses nodemailer with SMTP for provider-agnostic email delivery.
 *  - Email sending errors are logged but NOT re-thrown — a failed email
 *    should not cause the API request to fail (registration still succeeds;
 *    the user can request a new verification email).
 *  - HTML templates are defined inline for Phase 1 simplicity. In Phase 4,
 *    these will be moved to a template engine (Handlebars/MJML).
 */
@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly transporter: Transporter;
  private readonly from: string;
  private readonly frontendUrl: string;

  constructor(configService: ConfigService<AppConfig, true>) {
    const emailConfig = configService.get('email', { infer: true });
    this.from = emailConfig.from;
    this.frontendUrl = emailConfig.frontendUrl;

    this.transporter = nodemailer.createTransport({
      host: emailConfig.host,
      port: emailConfig.port,
      secure: emailConfig.secure,
      auth:
        emailConfig.user !== ''
          ? { user: emailConfig.user, pass: emailConfig.password }
          : undefined,
    });
  }

  async sendVerificationEmail(email: string, token: string, firstName?: string): Promise<void> {
    const verifyUrl = `${this.frontendUrl}/auth/verify-email?token=${token}`;
    const name = firstName ?? 'there';

    try {
      await this.transporter.sendMail({
        from: this.from,
        to: email,
        subject: '✅ Verify your InternTracker AI account',
        html: this.buildEmailHtml(
          'Verify Your Email Address',
          `Hi ${name},`,
          'Welcome to InternTracker AI! Please verify your email address to activate your account.',
          verifyUrl,
          'Verify Email Address',
          'This link expires in 24 hours. If you did not create an account, you can safely ignore this email.',
        ),
      });
      this.logger.log(`Verification email sent to ${email}`);
    } catch (error) {
      this.logger.error({ err: error, email }, 'Failed to send verification email');
    }
  }

  async sendPasswordResetEmail(email: string, token: string, firstName?: string): Promise<void> {
    const resetUrl = `${this.frontendUrl}/auth/reset-password?token=${token}`;
    const name = firstName ?? 'there';

    try {
      await this.transporter.sendMail({
        from: this.from,
        to: email,
        subject: '🔐 Reset your InternTracker AI password',
        html: this.buildEmailHtml(
          'Reset Your Password',
          `Hi ${name},`,
          'We received a request to reset your password. Click the button below to create a new password.',
          resetUrl,
          'Reset Password',
          'This link expires in 1 hour. If you did not request a password reset, you can safely ignore this email.',
        ),
      });
      this.logger.log(`Password reset email sent to ${email}`);
    } catch (error) {
      this.logger.error({ err: error, email }, 'Failed to send password reset email');
    }
  }

  private buildEmailHtml(
    heading: string,
    greeting: string,
    body: string,
    ctaUrl: string,
    ctaText: string,
    footer: string,
  ): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${heading}</title>
</head>
<body style="margin:0;padding:0;background:#0f0f1a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f0f1a;padding:40px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#16162a;border-radius:16px;border:1px solid #3a3a6a;overflow:hidden;max-width:560px;">
        <!-- Header -->
        <tr><td style="background:linear-gradient(135deg,#7c3aed,#ec4899);padding:32px;text-align:center;">
          <h1 style="margin:0;color:#fff;font-size:24px;font-weight:800;letter-spacing:-0.5px;">🎯 InternTracker AI</h1>
        </td></tr>
        <!-- Body -->
        <tr><td style="padding:40px;">
          <h2 style="color:#f0f0ff;font-size:20px;margin:0 0 16px;">${heading}</h2>
          <p style="color:#a0a0c0;font-size:15px;margin:0 0 8px;">${greeting}</p>
          <p style="color:#a0a0c0;font-size:15px;margin:0 0 32px;line-height:1.6;">${body}</p>
          <div style="text-align:center;margin-bottom:32px;">
            <a href="${ctaUrl}" style="display:inline-block;background:linear-gradient(135deg,#7c3aed,#ec4899);color:#fff;font-size:15px;font-weight:700;padding:14px 32px;border-radius:12px;text-decoration:none;">${ctaText}</a>
          </div>
          <p style="color:#6060a0;font-size:13px;margin:0;line-height:1.5;">${footer}</p>
          <hr style="border:none;border-top:1px solid #2a2a4a;margin:24px 0;">
          <p style="color:#6060a0;font-size:12px;margin:0;">Or copy this link: <a href="${ctaUrl}" style="color:#a78bfa;">${ctaUrl}</a></p>
        </td></tr>
        <!-- Footer -->
        <tr><td style="background:#0f0f1a;padding:20px;text-align:center;">
          <p style="color:#6060a0;font-size:12px;margin:0;">© ${new Date().getFullYear()} InternTracker AI. All rights reserved.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
  }
}
