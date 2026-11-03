import Link from "next/link";
import SiteHeader from "@/components/SiteHeader";

export const metadata = {
  title: "SMS Terms — J's Finest Barbershop",
  description: "How J's Finest Barbershop uses text messages for barber booking alerts.",
};

/**
 * Public terms for the barber booking-alert texts (src/lib/sms.ts). The phone
 * field on barber signup and Edit Profile links here; carriers review this
 * page during toll-free number verification, so keep it accurate.
 */
export default function SmsTermsPage() {
  return (
    <main className="relative">
      <SiteHeader />
      <section className="max-w-3xl mx-auto px-6 py-14 md:py-20">
        <p className="font-sans text-xs tracking-[0.4em] text-green-300 mb-3">TEXT MESSAGES</p>
        <h1 className="font-display text-4xl md:text-5xl text-gold-gradient mb-8">SMS Terms</h1>

        <div className="space-y-6 font-sans text-base text-white/80 leading-relaxed">
          <p>
            <strong className="text-gold-100">Program:</strong> J&apos;s Finest Barbershop LLC
            (4329 Gus Thomasson Rd, Mesquite, TX 75150) sends booking alerts by text message to
            the barbers who work at the shop.
          </p>
          <p>
            <strong className="text-gold-100">Who receives texts:</strong> only barbers who create
            a barber account on js-finestbarbershop.com and enter their mobile number on the signup
            form or in Edit Profile. Entering the number is optional, and the form states that it
            means agreeing to these alerts. Customers who book appointments do not receive texts
            from this program.
          </p>
          <p>
            <strong className="text-gold-100">What we send:</strong> a text when a customer books an
            appointment with the barber, or when an open &quot;Anyone Available&quot; appointment
            is waiting to be claimed. Each text includes the service, date and time, the
            customer&apos;s name and phone, and a link to the barber dashboard. No marketing.
          </p>
          <p>
            <strong className="text-gold-100">Frequency:</strong> varies with the number of bookings.
            Message and data rates may apply.
          </p>
          <p>
            <strong className="text-gold-100">Opt out:</strong> reply <strong>STOP</strong> to any
            message to stop receiving texts, or remove your phone number in Edit Profile. Reply{" "}
            <strong>HELP</strong> for help, or call the shop at (945) 360-9937.
          </p>
          <p>
            <strong className="text-gold-100">Privacy:</strong> phone numbers are used only to send
            these alerts. We do not sell or share mobile numbers or opt-in consent with third
            parties for marketing.
          </p>
          <p>
            Questions: jsfinestbarbershopmesquite@gmail.com · (945) 360-9937
          </p>
        </div>

        <div className="mt-10">
          <Link
            href="/"
            className="font-sans text-xs tracking-[0.3em] text-green-300 hover:text-gold-200 transition"
          >
            ← BACK TO HOME
          </Link>
        </div>
      </section>
    </main>
  );
}
