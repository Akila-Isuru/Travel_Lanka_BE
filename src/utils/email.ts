import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || "smtp.gmail.com",
  port: parseInt(process.env.EMAIL_PORT || "587"),
  secure: process.env.EMAIL_SECURE === "true",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

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
          <a href="${process.env.FRONTEND_URL}/booking/${bookingDetails.bookingId}" class="btn">View Booking</a>
        </div>

        <div class="footer">
          <p style="margin-bottom: 6px;">This is a system-generated confirmation. Please keep this for your records.</p>
          <p>If you have any questions, please contact our support team.</p>
          <p style="margin-top: 10px; font-size: 11px;">
            &copy; ${new Date().getFullYear()} Your Travel Platform. All rights reserved.
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
    
    View your booking: ${process.env.FRONTEND_URL}/booking/${bookingDetails.bookingId}
    
    Thank you for choosing us!
  `;

  const mailOptions = {
    from:
      process.env.EMAIL_FROM || `"Travel Platform" <${process.env.EMAIL_USER}>`,
    to: userEmail,
    subject: `Booking Confirmed - #${bookingDetails.bookingId}`,
    html,
    text,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Booking confirmation email sent to ${userEmail}`);
  } catch (error) {
    console.error("Email sending failed:", error);
    // Don't throw - booking should succeed even if email fails
  }
};
