const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);

class EmailService {
  // Send verification email
  async sendVerificationEmail(user, token) {
    try {
      const verificationUrl = `${process.env.APP_URL}/profile?verify=true&token=${token}`;
      
      const { data, error } = await resend.emails.send({
        from: `${process.env.APP_NAME} <onboarding@resend.dev>`,
        to: user.email,
        subject: `Verify Your ${process.env.APP_NAME} Account`,
        html: this.getVerificationTemplate(user, token, verificationUrl),
        text: `Verify your ${process.env.APP_NAME} account. Code: ${token} or click: ${verificationUrl}`
      });

      if (error) {
        console.error('Resend verification error:', error);
        return false;
      }

      console.log('✅ Verification email sent via Resend');
      return true;
    } catch (error) {
      console.error('Verification email error:', error);
      return false;
    }
  }

  // Send welcome email
  async sendWelcomeEmail(user) {
    try {
      const { data, error } = await resend.emails.send({
        from: `${process.env.APP_NAME} <welcome@resend.dev>`,
        to: user.email,
        subject: `Welcome to ${process.env.APP_NAME}!`,
        html: this.getWelcomeTemplate(user),
        text: `Welcome to ${process.env.APP_NAME}! We're excited to have you on board.`
      });

      if (error) {
        console.error('Resend welcome error:', error);
        return false;
      }

      console.log('✅ Welcome email sent via Resend');
      return true;
    } catch (error) {
      console.error('Welcome email error:', error);
      return false;
    }
  }

  // Send password reset email
  async sendPasswordResetEmail(user, token) {
    try {
      const resetUrl = `${process.env.APP_URL}/reset-password?token=${token}`;
      
      const { data, error } = await resend.emails.send({
        from: `${process.env.APP_NAME} <security@resend.dev>`,
        to: user.email,
        subject: `Reset Your ${process.env.APP_NAME} Password`,
        html: this.getPasswordResetTemplate(user, token, resetUrl),
        text: `Reset your password. Code: ${token} or click: ${resetUrl}`
      });

      if (error) {
        console.error('Resend password reset error:', error);
        return false;
      }

      console.log('✅ Password reset email sent via Resend');
      return true;
    } catch (error) {
      console.error('Password reset email error:', error);
      return false;
    }
  }

  // Send promotional email
  async sendPromotionalEmail(user, promotion) {
    try {
      const { data, error } = await resend.emails.send({
        from: `${process.env.APP_NAME} <news@resend.dev>`,
        to: user.email,
        subject: promotion.subject,
        html: this.getPromotionalTemplate(user, promotion),
        text: promotion.text || promotion.subject
      });

      if (error) {
        console.error('Resend promotional error:', error);
        return false;
      }

      console.log('✅ Promotional email sent via Resend');
      return true;
    } catch (error) {
      console.error('Promotional email error:', error);
      return false;
    }
  }

  // Email Templates
  getVerificationTemplate(user, token, verificationUrl) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          .container { max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif; }
          .header { background: #007bff; color: white; padding: 20px; text-align: center; }
          .content { padding: 30px; background: #f8f9fa; }
          .button { background: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block; }
          .code { background: white; padding: 15px; border-radius: 5px; font-family: monospace; font-size: 18px; text-align: center; margin: 20px 0; border: 2px dashed #007bff; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Verify Your Account</h1>
          </div>
          <div class="content">
            <h2>Hello ${user.firstName}!</h2>
            <p>Welcome to ${process.env.APP_NAME}! Please verify your email address to activate your account.</p>
            
            <div class="code">
              <strong>Verification Code:</strong><br>
              ${token}
            </div>
            
            <p style="text-align: center;">
              <a href="${verificationUrl}" class="button">Verify My Account</a>
            </p>
            
            <p><small>This code will expire in 24 hours.</small></p>
            <p>If you didn't create an account, please ignore this email.</p>
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} ${process.env.APP_NAME}. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  getWelcomeTemplate(user) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          .container { max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif; }
          .header { background: #28a745; color: white; padding: 20px; text-align: center; }
          .content { padding: 30px; background: #f8f9fa; }
          .button { background: #28a745; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Welcome to ${process.env.APP_NAME}!</h1>
          </div>
          <div class="content">
            <h2>Hello ${user.firstName}!</h2>
            <p>Thank you for joining ${process.env.APP_NAME}! We're excited to have you on board.</p>
            
            <p>Here's what you can do now:</p>
            <ul>
              <li>Complete your profile</li>
              <li>Explore our features</li>
              <li>Get started with your first project</li>
            </ul>
            
            <p style="text-align: center;">
              <a href="${process.env.APP_URL}/dashboard" class="button">Get Started</a>
            </p>
            
            <p>If you have any questions, feel free to reply to this email.</p>
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} ${process.env.APP_NAME}. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  getPasswordResetTemplate(user, token, resetUrl) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          .container { max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif; }
          .header { background: #dc3545; color: white; padding: 20px; text-align: center; }
          .content { padding: 30px; background: #f8f9fa; }
          .button { background: #dc3545; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block; }
          .code { background: white; padding: 15px; border-radius: 5px; font-family: monospace; font-size: 18px; text-align: center; margin: 20px 0; border: 2px dashed #dc3545; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Password Reset Request</h1>
          </div>
          <div class="content">
            <h2>Hello ${user.firstName}!</h2>
            <p>We received a request to reset your password for your ${process.env.APP_NAME} account.</p>
            
            <div class="code">
              <strong>Reset Code:</strong><br>
              ${token}
            </div>
            
            <p style="text-align: center;">
              <a href="${resetUrl}" class="button">Reset My Password</a>
            </p>
            
            <p><small>This code will expire in 1 hour.</small></p>
            <p>If you didn't request a password reset, please ignore this email and your password will remain unchanged.</p>
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} ${process.env.APP_NAME}. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  getPromotionalTemplate(user, promotion) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          .container { max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif; }
          .header { background: #6f42c1; color: white; padding: 20px; text-align: center; }
          .content { padding: 30px; background: #f8f9fa; }
          .button { background: #6f42c1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>${promotion.title || 'Special Offer!'}</h1>
          </div>
          <div class="content">
            <h2>Hello ${user.firstName}!</h2>
            ${promotion.content}
            
            ${promotion.ctaUrl ? `
            <p style="text-align: center;">
              <a href="${promotion.ctaUrl}" class="button">${promotion.ctaText || 'Learn More'}</a>
            </p>
            ` : ''}
            
            <p>Thank you for being a valued member of ${process.env.APP_NAME}!</p>
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} ${process.env.APP_NAME}. All rights reserved.</p>
            <p><a href="${process.env.APP_URL}/unsubscribe">Unsubscribe</a> from promotional emails</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }
}

module.exports = new EmailService();