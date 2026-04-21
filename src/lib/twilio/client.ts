import twilio from "twilio";

// API key auth (SK... + secret) scoped to our account, per Twilio's
// recommendation over using the root Auth Token. Sends use a Messaging
// Service so Twilio picks a sender number from the service's pool
// (supports number pooling, 10DLC routing, etc. without code changes).
export const twilioClient = twilio(
  process.env.TWILIO_API_KEY_SID!,
  process.env.TWILIO_API_KEY_SECRET!,
  { accountSid: process.env.TWILIO_ACCOUNT_SID! }
);

export const TWILIO_MESSAGING_SERVICE_SID = process.env.TWILIO_MESSAGING_SERVICE_SID!;
