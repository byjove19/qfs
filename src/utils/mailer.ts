// src/utils/mailer.ts
import nodemailer from 'nodemailer';
import config from '../config/env';

class Mailer {
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: config.EMAIL_HOST,
      port: parseInt(config.EMAIL_PORT || '587'),
      secure: false,
      auth: {
        user: config.EMAIL_USER,
        pass: config.EMAIL_PASS,
      },
    });
  }

  async sendVerificationEmail(email: string, token: string, firstName: string) {
    const verificationUrl = `${config.FRONTEND_URL}/verify-email?token=${token}`;

    const mailOptions = {
      from: `"QFS FinTech" <${config.EMAIL_USER}>`,
      to: email,
      subject: 'Verify Your QFS Account',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2c5aa0;">Welcome to QFS, ${firstName}!</h2>
          <p>Please verify your email address to complete your registration.</p>
          <a href="${verificationUrl}" 
             style="display: inline-block; padding: 12px 24px; background-color: #2c5aa0; color: white; text-decoration: none; border-radius: 4px;">
            Verify Email Address
          </a>
          <p>Or copy and paste this link in your browser:</p>
          <p>${verificationUrl}</p>
          <p>This link will expire in 24 hours.</p>
        </div>
      `,
    };

    await this.transporter.sendMail(mailOptions);
  }

  async sendPasswordResetEmail(email: string, token: string, firstName: string) {
    const resetUrl = `${config.FRONTEND_URL}/reset-password?token=${token}`;

    const mailOptions = {
      from: `"QFS FinTech" <${config.EMAIL_USER}>`,
      to: email,
      subject: 'Reset Your QFS Password',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2c5aa0;">Password Reset Request</h2>
          <p>Hello ${firstName},</p>
          <p>You requested to reset your password. Click the button below to create a new password:</p>
          <a href="${resetUrl}" 
             style="display: inline-block; padding: 12px 24px; background-color: #2c5aa0; color: white; text-decoration: none; border-radius: 4px;">
            Reset Password
          </a>
          <p>Or copy and paste this link in your browser:</p>
          <p>${resetUrl}</p>
          <p>This link will expire in 1 hour.</p>
          <p>If you didn't request this, please ignore this email.</p>
        </div>
      `,
    };

    await this.transporter.sendMail(mailOptions);
  }

  async sendTransactionNotification(email: string, transaction: any, firstName: string) {
    const mailOptions = {
      from: `"QFS FinTech" <${config.EMAIL_USER}>`,
      to: email,
      subject: `Transaction ${transaction.status} - ${transaction.referenceId}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2c5aa0;">Transaction Update</h2>
          <p>Hello ${firstName},</p>
          <p>Your transaction <strong>${transaction.referenceId}</strong> has been ${transaction.status}.</p>
          <div style="background-color: #f8f9fa; padding: 15px; border-radius: 4px;">
            <p><strong>Amount:</strong> ${transaction.currency} ${transaction.amount}</p>
            <p><strong>Type:</strong> ${transaction.type}</p>
            <p><strong>Description:</strong> ${transaction.description}</p>
          </div>
        </div>
      `,
    };

    await this.transporter.sendMail(mailOptions);
  }
}

export default new Mailer();