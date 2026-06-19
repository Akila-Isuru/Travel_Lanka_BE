import { Request, Response } from "express";
import BookingModel from "../models/bookingModel";
import ItineraryModel from "../models/itineraryModel";
import UserModel from "../models/userModel";
import crypto from "crypto";
import { AuthRequest } from "../middleware/auth";
const MERCHANT_ID = process.env.MERCHANT_ID as string;
const MERCHANT_SECRET = process.env.MERCHANT_SECRET as string;
const SANDBOX = process.env.PAYHERE_SANDBOX === "true";
const FRONTEND_URL = process.env.FRONTEND_URL as string;
const BACKEND_URL = process.env.BACKEND_URL as string;

const getPayhereActionUrl = () => {
  return SANDBOX
    ? "https://sandbox.payhere.lk/pay/checkout"
    : "https://www.payhere.lk/pay/checkout";
};

const generatePayhereHash = (
  merchantId: string,
  orderId: string,
  amount: string,
  currency: string,
  merchantSecret: string,
): string => {
  const amountFormatted = parseFloat(amount).toFixed(2);
  const hashedSecret = crypto
    .createHash("md5")
    .update(merchantSecret)
    .digest("hex")
    .toUpperCase();
  const hashString =
    merchantId + orderId + amountFormatted + currency + hashedSecret;
  const finalHash = crypto
    .createHash("md5")
    .update(hashString)
    .digest("hex")
    .toUpperCase();
  return finalHash;
};

export const initiatePayment = async (req: Request, res: Response) => {
  try {
    const { bookingId } = req.body;
    // ✅ Populate destination, stay, and user details
    const booking = await BookingModel.findById(bookingId)
      .populate("destination")
      .populate("stayId") // ✅ Add stay details for payment description
      .populate("user", "name email");

    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    const destination = booking.destination as any;
    const stay = booking.stayId as any; // ✅ Get stay details
    const user = booking.user as any;

    const orderId = booking._id.toString();
    const amount = booking.totalPrice.toFixed(2);
    const currency = "LKR";

    // ✅ Include stay name in payment items if stay selected
    let items = `Booking: ${destination.name}`;
    if (stay) {
      items += ` + ${stay.name}`;
    }

    const nameParts = user.name.split(" ");
    const firstName = nameParts[0] || "Guest";
    const lastName = nameParts.slice(1).join(" ") || "User";

    const hash = generatePayhereHash(
      MERCHANT_ID,
      orderId,
      amount,
      currency,
      MERCHANT_SECRET,
    );

    const paymentData = {
      sandbox: SANDBOX,
      merchant_id: MERCHANT_ID,
      return_url: `${FRONTEND_URL}/payment/return`,
      cancel_url: `${FRONTEND_URL}/payment/cancel`,
      notify_url: `${BACKEND_URL}/api/v1/payment/notify`,
      order_id: orderId,
      items: items,
      amount: amount,
      currency: currency,
      hash: hash,
      first_name: firstName,
      last_name: lastName,
      email: user.email,
      phone: "0771234567",
      address: "Colombo",
      city: "Colombo",
      country: "Sri Lanka",
    };

    console.log("Payment Initiation Data:", paymentData);
    res.json(paymentData);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error initiating payment" });
  }
};

export const handleNotification = async (req: Request, res: Response) => {
  console.log(" WEBHOOK HIT!", req.body);
  try {
    const {
      merchant_id,
      order_id,
      payment_id,
      payhere_amount,
      payhere_currency,
      status_code,
      md5sig,
      method,
    } = req.body;

    console.log("Webhook received:", req.body);

    const generatedHash = crypto
      .createHash("md5")
      .update(
        merchant_id +
          order_id +
          payhere_amount +
          payhere_currency +
          status_code +
          crypto
            .createHash("md5")
            .update(MERCHANT_SECRET)
            .digest("hex")
            .toUpperCase(),
      )
      .digest("hex")
      .toUpperCase();

    if (generatedHash !== md5sig) {
      console.error("Hash mismatch");
      return res.status(400).send("Hash verification failed");
    }

    // Handle itinerary payments
    if (order_id.startsWith("ITIN_")) {
      const itineraryId = order_id.replace("ITIN_", "");
      const itinerary = await ItineraryModel.findById(itineraryId);
      if (!itinerary) {
        console.error("Itinerary not found");
        return res.status(404).send("Itinerary not found");
      }

      if (status_code === "2") {
        await BookingModel.updateMany(
          { itineraryId: itinerary._id },
          {
            paymentStatus: "paid",
            paymentId: payment_id,
            paymentMethod: method,
            status: "confirmed",
          },
        );
        console.log(`Itinerary ${itineraryId} paid, all bookings confirmed.`);
      } else if (status_code === "-2") {
        await BookingModel.updateMany(
          { itineraryId: itinerary._id },
          { paymentStatus: "failed" },
        );
      } else if (status_code === "-1") {
        await BookingModel.updateMany(
          { itineraryId: itinerary._id },
          { status: "cancelled", paymentStatus: "failed" },
        );
      }
      return res.status(200).send("OK");
    }

    // Handle single booking payment
    const booking = await BookingModel.findById(order_id);
    if (!booking) {
      console.error("Booking not found");
      return res.status(404).send("Booking not found");
    }

    if (status_code === "2") {
      // ✅ Payment successful
      booking.paymentStatus = "paid";
      booking.paymentId = payment_id;
      booking.paymentMethod = method;
      booking.status = "confirmed";
      await booking.save();
      console.log(`Booking ${order_id} confirmed.`);
    } else if (status_code === "-2") {
      // ✅ Payment failed
      booking.paymentStatus = "failed";
      await booking.save();
      console.log(`Payment for booking ${order_id} failed.`);
    } else if (status_code === "-1") {
      // ✅ Payment cancelled
      booking.status = "cancelled";
      booking.paymentStatus = "failed";
      await booking.save();
      console.log(`Booking ${order_id} cancelled.`);
    }

    res.status(200).send("OK");
  } catch (error) {
    console.error(error);
    res.status(500).send("Error processing notification");
  }
};

export const initiateItineraryPayment = async (
  req: AuthRequest,
  res: Response,
) => {
  try {
    const { itineraryId } = req.body;
    const itinerary = await ItineraryModel.findOne({
      _id: itineraryId,
      user: req.user.sub,
    }).populate("destinations.destinationId");

    if (!itinerary) {
      return res.status(404).json({ message: "Itinerary not found" });
    }

    const amount = itinerary.totalPrice.toFixed(2);
    const orderId = `ITIN_${itinerary._id}`; // prefix to differentiate from single bookings
    const items = `Itinerary: ${itinerary.name} (${itinerary.destinations.length} destinations)`;

    const user = await UserModel.findById(req.user.sub);
    const nameParts = user?.name?.split(" ") || ["Guest", "User"];
    const firstName = nameParts[0];
    const lastName = nameParts.slice(1).join(" ") || "User";

    const hash = generatePayhereHash(
      MERCHANT_ID,
      orderId,
      amount,
      "LKR",
      MERCHANT_SECRET,
    );

    const paymentData = {
      sandbox: SANDBOX,
      merchant_id: MERCHANT_ID,
      return_url: `${FRONTEND_URL}/payment/return`,
      cancel_url: `${FRONTEND_URL}/payment/cancel`,
      notify_url: `${BACKEND_URL}/api/v1/payment/notify`,
      order_id: orderId,
      items: items,
      amount: amount,
      currency: "LKR",
      hash: hash,
      first_name: firstName,
      last_name: lastName,
      email: user?.email || "",
      phone: "0771234567",
      address: "Colombo",
      city: "Colombo",
      country: "Sri Lanka",
    };

    console.log("Itinerary Payment Initiation Data:", paymentData);
    res.json(paymentData);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error initiating itinerary payment" });
  }
};
