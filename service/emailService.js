// utils/emailService.js
import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: "mail.quantumfinancial-system.com", // your Spantrix mail host
  port: 465, // usually 465 for SSL
  secure: true,
  auth: {
    user: "welcome@quantumfinancial-system.com", // your QFS email
    pass: "YOUR_EMAIL_PASSWORD", // your email password or app password
  },
});

export const sendWelcomeEmail = async (to, name) => {
  const html = `
  <!DOCTYPE html>
  <html lang="en">
  <head><meta charset="UTF-8" /></head>
  <body style="font-family:Segoe UI,Arial,sans-serif;color:#222;">
    <div style="max-width:600px;margin:auto;padding:30px;background:#fff;border-radius:10px;">
      <h2 style="color:#0044ff;">Welcome to Quantum Financial System 🌐</h2>
      <p>Hi ${name || "there"},</p>
      <p>Thank you for joining <strong>Quantum Financial System (QFS)</strong> — 
      a decentralized financial network built on transparency and trust.</p>
      <p>You can log in to your dashboard and explore your account features below:</p>
      <p>
        <a href="https://quantumfinancial-system.com/login"
        style="display:inline-block;background:#0044ff;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;">
        Access Your Account
        </a>
      </p>
      <p>If this wasn’t you, please ignore this message.</p>
      <p>Warm regards,<br><strong>The QFS Global Team</strong></p>
    </div>
  </body>
  </html>
  `;

  await transporter.sendMail({
    from: '"QFS Global Team" <welcome@quantumfinancial-system.com>',
    to,
    subject: "🎉 Welcome to Quantum Financial System (QFS)",
    html,
  });
};
