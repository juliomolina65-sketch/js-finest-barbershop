import Link from "next/link";
import { redirect } from "next/navigation";
import AuthForm from "../AuthForm";
import { signupBarber } from "../actions";
import { getCurrentBarber } from "@/lib/auth";
import { getDict } from "@/lib/i18n";

export const metadata = {
  title: "Create Barber Account — J's Finest",
};

export const dynamic = "force-dynamic";

export default async function SignupPage() {
  const current = await getCurrentBarber();
  if (current) redirect("/dashboard");
  const t = (await getDict()).auth;

  return (
    <div>
      <p className="font-sans text-xs tracking-[0.4em] text-green-300 mb-2 text-center">
        {t.barberPortal}
      </p>
      <h1 className="font-display text-4xl md:text-5xl text-gold-gradient mb-2 text-center">
        {t.signUpTitle}
      </h1>
      <p className="font-sans text-sm text-white/60 text-center mb-8 max-w-xs mx-auto">
        {t.signUpIntro}
      </p>

      <AuthForm mode="signup" action={signupBarber} t={t} />

      <p className="font-sans text-xs text-white/50 text-center mt-6">
        {t.alreadyHave}{" "}
        <Link
          href="/login"
          className="text-gold-200 hover:text-gold-100 underline underline-offset-4"
        >
          {t.signInInstead}
        </Link>
      </p>
    </div>
  );
}
