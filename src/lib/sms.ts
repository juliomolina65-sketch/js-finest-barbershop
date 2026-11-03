/**
 * Text messages to barbers (new bookings). Sends through Twilio's REST API
 * with plain fetch, so there's no SDK dependency.
 *
 * Needs three env vars (Railway → Variables):
 *   TWILIO_ACCOUNT_SID   AC...
 *   TWILIO_AUTH_TOKEN    from the Twilio console
 *   TWILIO_FROM          the Twilio number, e.g. +18885551234
 * Without them nothing is sent and the booking still goes through.
 */

/** US numbers in any common format → +1XXXXXXXXXX. Null if it can't be a US number. */
export function toE164(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return null;
}

export function smsConfigured(): boolean {
  return Boolean(
    process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_FROM
  );
}

/** Sends one text. Never throws: a failed text must not break a booking. */
export async function sendSms(to: string, body: string): Promise<boolean> {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_FROM;
  if (!sid || !token || !from) {
    console.log(`[sms] not configured, skipped text to ${to}: ${body}`);
    return false;
  }
  try {
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
      method: "POST",
      headers: {
        Authorization: "Basic " + Buffer.from(`${sid}:${token}`).toString("base64"),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ To: to, From: from, Body: body }),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) {
      console.error(`[sms] Twilio ${res.status} sending to ${to}:`, await res.text());
      return false;
    }
    return true;
  } catch (err) {
    console.error(`[sms] failed sending to ${to}:`, err);
    return false;
  }
}
