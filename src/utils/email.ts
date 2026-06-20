import nodemailer from "nodemailer";
import dotenv from "dotenv";

// ===== Load environment variables =====
dotenv.config();

// ===== Debug: Check if email variables are loaded =====
console.log("📧 EMAIL_USER:", process.env.EMAIL_USER || "NOT SET");
console.log("📧 EMAIL_PASS:", process.env.EMAIL_PASS ? "✅ SET" : "❌ NOT SET");
console.log("📧 EMAIL_HOST:", process.env.EMAIL_HOST || "smtp.gmail.com");
console.log("📧 EMAIL_PORT:", process.env.EMAIL_PORT || "587");

// ===== Get email configuration =====
const EMAIL_USER = process.env.EMAIL_USER?.trim();
const EMAIL_PASS = process.env.EMAIL_PASS?.trim();
const EMAIL_HOST = process.env.EMAIL_HOST || "smtp.gmail.com";
const EMAIL_PORT = parseInt(process.env.EMAIL_PORT || "587");
const EMAIL_SECURE = process.env.EMAIL_SECURE === "true";
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";

// ===== Validate email configuration =====
const isEmailConfigured = (): boolean => {
  if (!EMAIL_USER) {
    console.error("❌ EMAIL_USER is not set in .env file");
    return false;
  }
  if (!EMAIL_PASS) {
    console.error("❌ EMAIL_PASS is not set in .env file");
    return false;
  }
  if (EMAIL_PASS.length < 10) {
    console.error(
      "❌ EMAIL_PASS seems too short. Make sure you're using App Password (16 chars)",
    );
    return false;
  }
  console.log("✅ Email configuration validated");
  return true;
};

// ===== Create transporter =====
let transporter: nodemailer.Transporter | null = null;

try {
  if (isEmailConfigured()) {
    transporter = nodemailer.createTransport({
      host: EMAIL_HOST,
      port: EMAIL_PORT,
      secure: EMAIL_SECURE,
      auth: {
        user: EMAIL_USER,
        pass: EMAIL_PASS,
      },
      tls: {
        rejectUnauthorized: false,
      },
    });

    // Verify connection
    transporter.verify((error, success) => {
      if (error) {
        console.error(
          "❌ Email transporter verification failed:",
          error.message,
        );
        transporter = null;
      } else {
        console.log("✅ Email transporter ready to send emails");
      }
    });
  }
} catch (error: any) {
  console.error("❌ Failed to create email transporter:", error.message);
  transporter = null;
}

// ===== Helper: Send email safely =====
const sendEmail = async (options: {
  to: string;
  subject: string;
  html: string;
  text: string;
}): Promise<void> => {
  // Debug: Log what we're sending
  console.log("📧 Sending email to:", options.to);
  console.log("📧 Subject:", options.subject);
  console.log("📧 From:", EMAIL_USER);

  if (!transporter) {
    console.error("❌ Email transporter not available");
    throw new Error("Email service not configured");
  }

  if (!options.to || !options.to.trim()) {
    console.error("❌ No recipient email provided");
    throw new Error("No recipient email provided");
  }

  if (!EMAIL_USER) {
    console.error("❌ EMAIL_USER is not set");
    throw new Error("Email sender not configured");
  }

  try {
    const mailOptions = {
      from: `"LankaTravel" <${EMAIL_USER}>`,
      to: options.to.trim(),
      subject: options.subject,
      text: options.text,
      html: options.html,
    };

    console.log("📧 Mail options:", {
      from: mailOptions.from,
      to: mailOptions.to,
      subject: mailOptions.subject,
    });

    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ Email sent successfully to ${options.to}`);
    console.log("📧 Message ID:", info.messageId);
  } catch (error: any) {
    console.error("❌ Email sending failed:", error.message);
    if (error.code) {
      console.error("❌ Error code:", error.code);
    }
    if (error.response) {
      console.error("❌ Error response:", error.response);
    }
    throw new Error("Failed to send email: " + error.message);
  }
};

// ===== BOOKING CONFIRMATION EMAIL =====
export const sendBookingConfirmationEmail = async (
  userEmail: string,
  userName: string,
  bookingDetails: {
    destinationName: string;
    stayName?: string;
    checkIn: Date;
    checkOut: Date;
    guests: number;
    totalPrice: number;
    bookingId: string;
    specialRequests?: string;
  },
) => {
  if (!isEmailConfigured()) {
    console.warn("⚠️ Email not configured. Skipping booking confirmation.");
    return;
  }

  const nights = Math.floor(
    (new Date(bookingDetails.checkOut).getTime() -
      new Date(bookingDetails.checkIn).getTime()) /
      (1000 * 60 * 60 * 24),
  );

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: 'Georgia', serif; background-color: #faf8f4; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 0 auto; padding: 40px 30px; background: #ffffff; border: 1px solid #e8e4de; }
        .header { border-bottom: 2px solid #C9922A; padding-bottom: 20px; margin-bottom: 30px; text-align: center; }
        .header h1 { font-family: 'Georgia', serif; font-weight: 300; font-style: italic; color: #1a3a5c; font-size: 28px; margin: 0; }
        .header .gold-line { width: 60px; height: 2px; background: #C9922A; margin: 10px auto 0; }
        .booking-id { background: #faf8f4; padding: 12px 20px; text-align: center; font-size: 13px; color: #666; border: 1px solid #e8e4de; margin-bottom: 25px; }
        .booking-id strong { color: #1a3a5c; letter-spacing: 0.5px; }
        .section { margin-bottom: 25px; }
        .section-title { font-size: 11px; text-transform: uppercase; letter-spacing: 2px; color: #C9922A; font-weight: 400; margin-bottom: 8px; }
        .section-content { font-size: 15px; color: #1a3a5c; padding: 12px 16px; background: #faf8f4; border-left: 2px solid #C9922A; }
        .section-content .label { color: #999; font-size: 12px; }
        .total-box { background: #0a1628; padding: 20px 24px; text-align: center; margin: 25px 0; }
        .total-box .amount { font-family: 'Georgia', serif; font-size: 32px; color: #C9922A; font-weight: 300; }
        .total-box .label { color: rgba(255,255,255,0.5); font-size: 11px; text-transform: uppercase; letter-spacing: 2px; }
        .footer { border-top: 1px solid #e8e4de; padding-top: 20px; margin-top: 30px; text-align: center; font-size: 12px; color: #999; }
        .footer a { color: #C9922A; text-decoration: none; }
        .btn { display: inline-block; padding: 12px 32px; background: #C9922A; color: #fff !important; text-decoration: none; font-size: 11px; text-transform: uppercase; letter-spacing: 2px; clip-path: polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 8px 100%, 0 calc(100% - 8px)); }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Booking Confirmed</h1>
          <div class="gold-line"></div>
        </div>
        
        <div class="booking-id">
          Booking ID: <strong>#${bookingDetails.bookingId}</strong>
        </div>

        <p style="color: #1a3a5c; font-size: 16px; margin-bottom: 25px;">
          Dear <strong>${userName}</strong>,
        </p>
        <p style="color: #555; font-size: 14px; line-height: 1.7; margin-bottom: 25px;">
          Thank you for booking with us! Your reservation has been confirmed. 
          Please find your booking details below.
        </p>

        <div class="section">
          <div class="section-title">Destination</div>
          <div class="section-content">${bookingDetails.destinationName}</div>
        </div>

        ${
          bookingDetails.stayName
            ? `
        <div class="section">
          <div class="section-title">Stay / Accommodation</div>
          <div class="section-content">${bookingDetails.stayName}</div>
        </div>
        `
            : ""
        }

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 25px;">
          <div>
            <div class="section-title">Check-In</div>
            <div class="section-content" style="font-size: 14px; padding: 10px 14px;">
              ${new Date(bookingDetails.checkIn).toLocaleDateString("en-US", {
                weekday: "short",
                year: "numeric",
                month: "short",
                day: "numeric",
              })}
            </div>
          </div>
          <div>
            <div class="section-title">Check-Out</div>
            <div class="section-content" style="font-size: 14px; padding: 10px 14px;">
              ${new Date(bookingDetails.checkOut).toLocaleDateString("en-US", {
                weekday: "short",
                year: "numeric",
                month: "short",
                day: "numeric",
              })}
            </div>
          </div>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 25px;">
          <div>
            <div class="section-title">Nights</div>
            <div class="section-content" style="font-size: 14px; padding: 10px 14px;">${nights}</div>
          </div>
          <div>
            <div class="section-title">Guests</div>
            <div class="section-content" style="font-size: 14px; padding: 10px 14px;">${bookingDetails.guests}</div>
          </div>
        </div>

        ${
          bookingDetails.specialRequests
            ? `
        <div class="section">
          <div class="section-title">Special Requests</div>
          <div class="section-content" style="font-style: italic; color: #666; font-size: 14px;">
            "${bookingDetails.specialRequests}"
          </div>
        </div>
        `
            : ""
        }

        <div class="total-box">
          <div class="label">Total Amount</div>
          <div class="amount">$${bookingDetails.totalPrice.toFixed(2)}</div>
          <div style="color: rgba(255,255,255,0.3); font-size: 10px; letter-spacing: 1px; margin-top: 4px;">
            PAID VIA PAYHERE
          </div>
        </div>

        <div style="text-align: center; margin: 25px 0;">
          <a href="${FRONTEND_URL}/booking/${bookingDetails.bookingId}" class="btn">View Booking</a>
        </div>

        <div class="footer">
          <p style="margin-bottom: 6px;">This is a system-generated confirmation. Please keep this for your records.</p>
          <p>If you have any questions, please contact our support team.</p>
          <p style="margin-top: 10px; font-size: 11px;">
            &copy; ${new Date().getFullYear()} LankaTravel. All rights reserved.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `
    Booking Confirmation - #${bookingDetails.bookingId}
    
    Dear ${userName},
    
    Thank you for booking with us! Your reservation has been confirmed.
    
    Destination: ${bookingDetails.destinationName}
    ${bookingDetails.stayName ? `Stay: ${bookingDetails.stayName}` : ""}
    Check-In: ${new Date(bookingDetails.checkIn).toLocaleDateString()}
    Check-Out: ${new Date(bookingDetails.checkOut).toLocaleDateString()}
    Nights: ${nights}
    Guests: ${bookingDetails.guests}
    Total: $${bookingDetails.totalPrice.toFixed(2)}
    ${bookingDetails.specialRequests ? `Special Requests: ${bookingDetails.specialRequests}` : ""}
    
    View your booking: ${FRONTEND_URL}/booking/${bookingDetails.bookingId}
    
    Thank you for choosing us!
  `;

  try {
    await sendEmail({
      to: userEmail,
      subject: `Booking Confirmed - #${bookingDetails.bookingId}`,
      html,
      text,
    });
  } catch (error) {
    console.error("Booking confirmation email failed:", error);
  }
};

// ===== PASSWORD RESET EMAIL =====
export const sendResetPasswordEmail = async (
  email: string,
  name: string,
  resetLink: string,
): Promise<void> => {
  console.log("📧 sendResetPasswordEmail called");

  // ===== FIX: Ensure parameters are strings =====
  const emailStr =
    typeof email === "string" ? email.trim() : String(email || "").trim();
  const nameStr =
    typeof name === "string" ? name.trim() : String(name || "User").trim();
  const resetLinkStr =
    typeof resetLink === "string"
      ? resetLink.trim()
      : String(resetLink || "").trim();

  console.log("📧 Email:", emailStr);
  console.log("📧 Name:", nameStr);
  console.log("📧 Reset Link:", resetLinkStr);

  if (!emailStr) {
    console.error("❌ No email provided");
    throw new Error("No recipient email provided");
  }

  if (!resetLinkStr) {
    console.error("❌ No reset link provided");
    throw new Error("No reset link provided");
  }

  if (!isEmailConfigured()) {
    console.error("❌ Email not configured. Cannot send reset email.");
    throw new Error("Email service not configured");
  }

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Reset Your Password</title>
      <style>
        body { font-family: 'Georgia', serif; background-color: #faf8f4; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
        .card { background: #ffffff; border: 1px solid #e5e7eb; padding: 40px; }
        .logo { font-size: 24px; color: #0a1628; letter-spacing: 0.3em; text-transform: uppercase; margin-bottom: 10px; }
        .logo span { color: #C9922A; }
        .heading { font-size: 28px; color: #0a1628; font-weight: 300; margin-bottom: 16px; }
        .text { color: #4a5568; line-height: 1.8; font-size: 16px; margin-bottom: 24px; }
        .button { display: inline-block; background: #C9922A; color: #ffffff; padding: 14px 40px; text-decoration: none; font-size: 14px; letter-spacing: 0.2em; text-transform: uppercase; }
        .button:hover { background: #b07d20; }
        .footer { margin-top: 32px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #9ca3af; font-size: 13px; }
        .expiry { color: #ef4444; font-size: 13px; margin-top: 12px; }
        .link-text { color: #C9922A; word-break: break-all; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="card">
          <div class="logo">Lanka<span>Travel</span></div>
          <h1 class="heading">Reset Your Password</h1>
          <p class="text">Hello <strong>${nameStr}</strong>,</p>
          <p class="text">
            We received a request to reset the password for your LankaTravel account.
            Click the button below to create a new password.
          </p>
          <div style="text-align: center; margin: 32px 0;">
            <a href="${resetLinkStr}" class="button">Reset Password</a>
          </div>
          <p class="text" style="font-size: 14px; color: #6b7280;">
            If the button doesn't work, copy and paste this link into your browser:
          </p>
          <p class="text" style="font-size: 13px; word-break: break-all; color: #C9922A;">
            <a href="${resetLinkStr}" style="color: #C9922A;">${resetLinkStr}</a>
          </p>
          <p class="expiry">⏱️ This link will expire in <strong>1 hour</strong>.</p>
          <p class="text" style="font-size: 14px; color: #6b7280; margin-top: 16px;">
            If you didn't request this, please ignore this email or contact our support team.
          </p>
          <div class="footer">
            <p>— LankaTravel Team 🇱🇰</p>
            <p style="font-size: 12px; margin-top: 8px;">
              © ${new Date().getFullYear()} LankaTravel. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;

  const textContent = `
    LankaTravel - Reset Your Password
    
    Hello ${nameStr},
    
    We received a request to reset the password for your LankaTravel account.
    
    Click the link below to create a new password:
    ${resetLinkStr}
    
    This link will expire in 1 hour.
    
    If you didn't request this, please ignore this email.
    
    — LankaTravel Team
  `;

  try {
    await sendEmail({
      to: emailStr,
      subject: "🔐 LankaTravel - Password Reset Request",
      html: htmlContent,
      text: textContent,
    });
    console.log(`✅ Password reset email sent to ${emailStr}`);
  } catch (error: any) {
    console.error("❌ Password reset email failed:", error.message);
    throw new Error("Failed to send password reset email: " + error.message);
  }
};

// ===== PASSWORD RESET CONFIRMATION EMAIL =====
export const sendPasswordResetConfirmation = async (
  email: string,
  name: string,
): Promise<void> => {
  if (!isEmailConfigured()) {
    console.warn("⚠️ Email not configured. Skipping confirmation email.");
    return;
  }

  // ===== FIX: Ensure parameters are strings =====
  const emailStr =
    typeof email === "string" ? email.trim() : String(email || "").trim();
  const nameStr =
    typeof name === "string" ? name.trim() : String(name || "User").trim();

  if (!emailStr) {
    console.warn("⚠️ No email provided for confirmation");
    return;
  }

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Password Reset Successful</title>
      <style>
        body { font-family: 'Georgia', serif; background-color: #faf8f4; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
        .card { background: #ffffff; border: 1px solid #e5e7eb; padding: 40px; }
        .logo { font-size: 24px; color: #0a1628; letter-spacing: 0.3em; text-transform: uppercase; margin-bottom: 10px; }
        .logo span { color: #C9922A; }
        .heading { font-size: 28px; color: #0a1628; font-weight: 300; margin-bottom: 16px; }
        .text { color: #4a5568; line-height: 1.8; font-size: 16px; }
        .success-icon { font-size: 48px; text-align: center; margin: 20px 0; }
        .footer { margin-top: 32px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #9ca3af; font-size: 13px; }
        .button { display: inline-block; background: #C9922A; color: #ffffff; padding: 14px 40px; text-decoration: none; font-size: 14px; letter-spacing: 0.2em; text-transform: uppercase; }
        .button:hover { background: #b07d20; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="card">
          <div class="logo">Lanka<span>Travel</span></div>
          <div class="success-icon">✅</div>
          <h1 class="heading">Password Reset Successful</h1>
          <p class="text">Hello <strong>${nameStr}</strong>,</p>
          <p class="text">
            Your password has been successfully reset. You can now log in to your LankaTravel account with your new password.
          </p>
          <div style="text-align: center; margin: 32px 0;">
            <a href="${FRONTEND_URL}/login" class="button">Sign In Now</a>
          </div>
          <div class="footer">
            <p>— LankaTravel Team 🇱🇰</p>
            <p style="font-size: 12px; margin-top: 8px;">
              © ${new Date().getFullYear()} LankaTravel. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;

  const textContent = `
    LankaTravel - Password Reset Successful
    
    Hello ${nameStr},
    
    Your password has been successfully reset. You can now log in to your LankaTravel account with your new password.
    
    Sign in: ${FRONTEND_URL}/login
    
    — LankaTravel Team
  `;

  try {
    await sendEmail({
      to: emailStr,
      subject: "✅ LankaTravel - Password Reset Successful",
      html: htmlContent,
      text: textContent,
    });
    console.log(`✅ Password reset confirmation sent to ${emailStr}`);
  } catch (error: any) {
    console.error("❌ Password reset confirmation failed:", error.message);
  }
};
