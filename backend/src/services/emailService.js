import nodemailer from 'nodemailer';
import config from '../config/index.js';

class EmailService {
  constructor() {
    this.transporter = null;
    this.initialized = false;
  }

  /**
   * Initialize email transporter
   */
  initialize() {
    if (this.initialized) return;

    // Check if email is configured
    if (!config.email.host || !config.email.user) {
      console.warn('⚠️ Email service not configured - emails will be logged only');
      this.initialized = true;
      return;
    }

    this.transporter = nodemailer.createTransport({
      host: config.email.host,
      port: config.email.port,
      secure: config.email.port === 465,
      auth: {
        user: config.email.user,
        pass: config.email.pass,
      },
    });

    this.initialized = true;
    console.log('✅ Email service initialized');
  }

  /**
   * Send email
   */
  async send({ to, subject, html, text }) {
    this.initialize();

    const mailOptions = {
      from: `Bassac Post <${config.email.from}>`,
      to,
      subject,
      html,
      text: text || html.replace(/<[^>]*>/g, ''),
    };

    // If transporter not available, just log
    if (!this.transporter) {
      console.log('📧 Email (not sent - no transporter):', {
        to,
        subject,
        preview: text?.substring(0, 100) || html.substring(0, 100),
      });
      return { messageId: 'mock-' + Date.now() };
    }

    try {
      const result = await this.transporter.sendMail(mailOptions);
      console.log('📧 Email sent:', result.messageId);
      return result;
    } catch (error) {
      console.error('❌ Email sending failed:', error);
      throw error;
    }
  }

  /**
   * Send email verification
   */
  async sendVerificationEmail(user, token) {
    const verificationUrl = `${config.frontendUrl}/verify-email?token=${token}`;

    await this.send({
      to: user.email,
      subject: 'Verify Your Email - Bassac Post',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #1e40af; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background: #f9fafb; }
            .button { display: inline-block; padding: 12px 24px; background: #1e40af; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; }
            .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Bassac Post</h1>
            </div>
            <div class="content">
              <h2>Welcome, ${user.firstName}!</h2>
              <p>Thank you for registering with Bassac Post. Please verify your email address by clicking the button below:</p>
              <p style="text-align: center;">
                <a href="${verificationUrl}" class="button">Verify Email</a>
              </p>
              <p>Or copy and paste this link in your browser:</p>
              <p style="word-break: break-all; color: #1e40af;">${verificationUrl}</p>
              <p>This link will expire in 24 hours.</p>
              <p>If you didn't create an account, please ignore this email.</p>
            </div>
            <div class="footer">
              <p>&copy; ${new Date().getFullYear()} Bassac Post. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `,
    });
  }

  /**
   * Send password reset email
   */
  async sendPasswordResetEmail(user, token) {
    const resetUrl = `${config.frontendUrl}/reset-password?token=${token}`;

    await this.send({
      to: user.email,
      subject: 'Reset Your Password - Bassac Post',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #1e40af; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background: #f9fafb; }
            .button { display: inline-block; padding: 12px 24px; background: #dc2626; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; }
            .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Bassac Post</h1>
            </div>
            <div class="content">
              <h2>Password Reset Request</h2>
              <p>Hi ${user.firstName},</p>
              <p>We received a request to reset your password. Click the button below to create a new password:</p>
              <p style="text-align: center;">
                <a href="${resetUrl}" class="button">Reset Password</a>
              </p>
              <p>Or copy and paste this link in your browser:</p>
              <p style="word-break: break-all; color: #dc2626;">${resetUrl}</p>
              <p>This link will expire in 1 hour.</p>
              <p>If you didn't request a password reset, please ignore this email or contact support if you have concerns.</p>
            </div>
            <div class="footer">
              <p>&copy; ${new Date().getFullYear()} Bassac Post. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `,
    });
  }

  /**
   * Send article approved notification
   */
  async sendArticleApprovedEmail(user, article) {
    const articleUrl = `${config.frontendUrl}/articles/${article.slug}`;

    await this.send({
      to: user.email,
      subject: `Your Article Has Been Published - ${article.title}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #059669; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background: #f9fafb; }
            .button { display: inline-block; padding: 12px 24px; background: #059669; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; }
            .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎉 Article Published!</h1>
            </div>
            <div class="content">
              <h2>Congratulations, ${user.firstName}!</h2>
              <p>Great news! Your article "<strong>${article.title}</strong>" has been approved and is now live on Bassac Post.</p>
              <p style="text-align: center;">
                <a href="${articleUrl}" class="button">View Your Article</a>
              </p>
              <p>Thank you for contributing to our platform!</p>
            </div>
            <div class="footer">
              <p>&copy; ${new Date().getFullYear()} Bassac Post. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `,
    });
  }

  /**
   * Send article rejected notification
   */
  async sendArticleRejectedEmail(user, article, reason) {
    await this.send({
      to: user.email,
      subject: `Article Review Feedback - ${article.title}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #dc2626; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background: #f9fafb; }
            .reason-box { background: #fef2f2; border-left: 4px solid #dc2626; padding: 15px; margin: 20px 0; }
            .button { display: inline-block; padding: 12px 24px; background: #1e40af; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; }
            .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Article Needs Revision</h1>
            </div>
            <div class="content">
              <h2>Hi ${user.firstName},</h2>
              <p>Your article "<strong>${article.title}</strong>" has been reviewed but needs some changes before it can be published.</p>
              <div class="reason-box">
                <strong>Editor's Feedback:</strong>
                <p>${reason || 'Please review and revise your article.'}</p>
              </div>
              <p>Please make the necessary revisions and resubmit your article for review.</p>
              <p style="text-align: center;">
                <a href="${config.frontendUrl}/dashboard/articles/${article._id}/edit" class="button">Edit Article</a>
              </p>
            </div>
            <div class="footer">
              <p>&copy; ${new Date().getFullYear()} Bassac Post. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `,
    });
  }

  /**
   * Send contact form submission notification
   */
  async sendContactNotification(contact) {
    await this.send({
      to: config.email.from, // Send to admin email
      subject: `New Contact Message: ${contact.subject}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #1e40af; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background: #f9fafb; }
            .info-box { background: white; border: 1px solid #e5e7eb; padding: 15px; margin: 15px 0; border-radius: 6px; }
            .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>New Contact Message</h1>
            </div>
            <div class="content">
              <div class="info-box">
                <p><strong>From:</strong> ${contact.name}</p>
                <p><strong>Email:</strong> ${contact.email}</p>
                <p><strong>Subject:</strong> ${contact.subject}</p>
              </div>
              <h3>Message:</h3>
              <div class="info-box">
                <p>${contact.message.replace(/\n/g, '<br>')}</p>
              </div>
            </div>
            <div class="footer">
              <p>Received on ${new Date().toLocaleString()}</p>
            </div>
          </div>
        </body>
        </html>
      `,
    });
  }
}

// Export singleton instance
export default new EmailService();
