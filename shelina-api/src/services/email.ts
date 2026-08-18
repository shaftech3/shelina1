import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import { env } from '../lib/env.js';

/**
 * ============================================================================
 * BREVO SMTP EMAIL SERVICE
 * ============================================================================
 *
 * Handles outgoing transactional emails via Brevo SMTP.
 *
 * Configured via environment variables:
 *   BREVO_SMTP_HOST (default: smtp-relay.brevo.com)
 *   BREVO_SMTP_PORT (default: 587)
 *   BREVO_SMTP_USER
 *   BREVO_SMTP_PASSWORD
 *   BREVO_FROM_EMAIL
 *   BREVO_FROM_NAME
 *
 * Features:
 *   - Lazy transporter creation
 *   - Automatic verification at boot (without printing passwords)
 *   - Graceful fallback when credentials are not yet configured in development
 *   - Security: Zero secret leakage in logs, headers, or client bundles
 */

let cachedTransporter: Transporter | null = null;

export function getEmailTransporter(): Transporter | null {
  if (cachedTransporter) return cachedTransporter;

  if (!env.brevo.isConfigured) {
    if (env.isProduction) {
      console.warn(
        '[email] BREVO_SMTP_USER / BREVO_SMTP_PASSWORD are not configured in production environment. Email delivery is paused.',
      );
    }
    return null;
  }

  cachedTransporter = nodemailer.createTransport({
    host: env.brevo.smtpHost,
    port: env.brevo.smtpPort,
    secure: env.brevo.smtpPort === 465,
    auth: {
      user: env.brevo.smtpUser,
      pass: env.brevo.smtpPassword,
    },
  });

  return cachedTransporter;
}

export interface SendEmailOptions {
  to: string;
  subject: string;
  text?: string;
  html?: string;
  replyTo?: string;
}

export async function sendEmail(options: SendEmailOptions): Promise<{ success: boolean; messageId?: string }> {
  const transporter = getEmailTransporter();
  const fromAddress = `"${env.brevo.fromName}" <${env.brevo.fromEmail}>`;

  if (!transporter) {
    console.log(`[email] (dry-run/unconfigured) To: ${options.to} | Subject: "${options.subject}"`);
    return { success: true, messageId: 'simulated-dev-id' };
  }

  try {
    const info = await transporter.sendMail({
      from: fromAddress,
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html,
      replyTo: options.replyTo ?? env.brevo.fromEmail,
    });
    console.log(`[email] Sent email to ${options.to} (id: ${info.messageId})`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error(`[email] Failed to send email to ${options.to}:`, error instanceof Error ? error.message : error);
    return { success: false };
  }
}

/**
 * Validates Brevo SMTP connectivity at server startup.
 */
export async function verifyEmailConfiguration(): Promise<void> {
  if (!env.brevo.isConfigured) {
    console.log(
      `[email] Brevo SMTP: awaiting user credentials (BREVO_SMTP_USER & BREVO_SMTP_PASSWORD). Dry-run active in ${env.NODE_ENV}.`,
    );
    return;
  }

  try {
    const transporter = getEmailTransporter();
    if (transporter) {
      await transporter.verify();
      console.log(`[email] Brevo SMTP connection verified (${env.brevo.smtpHost}:${env.brevo.smtpPort})`);
    }
  } catch (error) {
    console.warn(
      `[email] Brevo SMTP connection verification note:`,
      error instanceof Error ? error.message : error,
    );
  }
}
