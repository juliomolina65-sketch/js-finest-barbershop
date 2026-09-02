"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import { fetchSlots, reserveAppointment } from "./actions";
import { formatLocalDate, type Slot } from "@/lib/booking";
import type { Dict } from "@/lib/i18n";

type ServiceLite = {
  id: string;
  slug: string;
  name: string;
  priceCents: number;
  durationMin: number;
  description: string;
};

type BarberLite = {
  id: string;
  slug: string;
  name: string;
  role: string;
};

type Step = "service" | "date" | "time" | "barber" | "info";

type Props = {
  services: ServiceLite[];
  barbers: BarberLite[];
  candidateDates: string[];
  /** Pre-selected barber slug from /book?barber=<slug> deep links. */
  initialBarberSlug?: string | null;
  t: Dict["book"];
  /** Slug-keyed service translations, passed down from the page. */
  serviceCatalog: ServiceCatalog;
};

const ANY_BARBER = "any" as const;

/**
 * Services are stored in the database in English. These helpers swap in the
 * reader's language using the slug-keyed catalog from i18n, falling back to the
 * stored value for any service that has no translation yet.
 */
type ServiceCatalog = Dict["landing"]["serviceCatalog"];

function serviceName(s: ServiceLite, catalog: ServiceCatalog): string {
  return catalog[s.slug as keyof ServiceCatalog]?.name ?? s.name;
}
function serviceDesc(s: ServiceLite, catalog: ServiceCatalog): string {
  return catalog[s.slug as keyof ServiceCatalog]?.desc ?? s.description;
}

function money(cents: number) {
  return `$${(cents / 100).toFixed(0)}`;
}
function makeDur(minLabel: string, hourLabel: string) {
  return (min: number) => {
    if (min < 60) return `${min} ${minLabel}`;
    const h = Math.floor(min / 60);
    const m = min % 60;
    return m ? `${h}${hourLabel} ${m}${minLabel}` : `${h}${hourLabel}`;
  };
}
function fmtSlotTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
}
function fmtDay(dateStr: string) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  return dt.toLocaleDateString([], {
    weekday: "long",
    month: "short",
    day: "numeric",
  });
}

export default function BookingFlow({
  services,
  barbers,
  candidateDates,
  initialBarberSlug = null,
  t,
  serviceCatalog,
}: Props) {
  const router = useRouter();
  const dur = useMemo(() => makeDur(t.durationMin, t.hour), [t]);

  // Resolve preferred barber once at mount
  const preferredBarber = useMemo(
    () =>
      initialBarberSlug
        ? barbers.find((b) => b.slug === initialBarberSlug) ?? null
        : null,
    [initialBarberSlug, barbers]
  );

  const [step, setStep] = useState<Step>("service");
  const [serviceId, setServiceId] = useState<string | null>(null);
  const [dateStr, setDateStr] = useState<string | null>(null);
  const [slot, setSlot] = useState<Slot | null>(null);
  const [barberChoice, setBarberChoice] = useState<string | null>(null);
  const [info, setInfo] = useState({ name: "", email: "", phone: "", notes: "" });
  /** Set when we tried to auto-skip the barber step but the preferred barber wasn't free. */
  const [preferredUnavailable, setPreferredUnavailable] = useState(false);

  const [allSlots, setAllSlots] = useState<Slot[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const service = useMemo(
    () => services.find((s) => s.id === serviceId) || null,
    [serviceId, services]
  );

  // When a specific barber was deep-linked (e.g. /book?barber=julio), only
  // show times when THAT barber is actually free. Without this filter the grid
  // would include slots where the preferred barber is booked but other barbers
  // happen to be free.
  const slots = useMemo(() => {
    if (!preferredBarber) return allSlots;
    return allSlots.filter((s) =>
      s.availableBarberIds.includes(preferredBarber.id)
    );
  }, [allSlots, preferredBarber]);

  // When date or service changes, refetch slots
  useEffect(() => {
    if (!dateStr || !serviceId) return;
    let cancelled = false;
    setSlotsLoading(true);
    fetchSlots(dateStr, serviceId)
      .then((s) => {
        if (!cancelled) setAllSlots(s);
      })
      .catch(() => {
        if (!cancelled) setAllSlots([]);
      })
      .finally(() => {
        if (!cancelled) setSlotsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [dateStr, serviceId]);

  // Reset downstream when upstream changes
  function pickService(id: string) {
    setServiceId(id);
    setDateStr(null);
    setSlot(null);
    setBarberChoice(null);
    setStep("date");
  }
  function pickDate(d: string) {
    setDateStr(d);
    setSlot(null);
    setBarberChoice(null);
    setStep("time");
  }
  function pickSlot(s: Slot) {
    setSlot(s);
    // If a barber was preferred via /book?barber=<slug> AND they're available at
    // this slot, auto-select them and skip past the barber step.
    if (preferredBarber && s.availableBarberIds.includes(preferredBarber.id)) {
      setBarberChoice(preferredBarber.id);
      setPreferredUnavailable(false);
      setStep("info");
    } else {
      setPreferredUnavailable(Boolean(preferredBarber));
      setBarberChoice(null);
      setStep("barber");
    }
  }
  function pickBarber(id: string) {
    setBarberChoice(id);
    setStep("info");
  }

  function back() {
    if (step === "date") setStep("service");
    else if (step === "time") setStep("date");
    else if (step === "barber") setStep("time");
    else if (step === "info") setStep("barber");
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!service || !slot || !barberChoice) return;
    setSubmitError(null);
    startTransition(async () => {
      const res = await reserveAppointment({
        serviceId: service.id,
        startAt: slot.startAt,
        preferredBarberId: barberChoice === ANY_BARBER ? null : barberChoice,
        customer: {
          name: info.name.trim(),
          email: info.email.trim(),
          phone: info.phone.trim(),
        },
        notes: info.notes,
      });
      if (!res.ok) {
        setSubmitError(res.error);
        return;
      }
      router.push(`/book/confirmed/${res.token}`);
    });
  }

  const stepNum =
    step === "service"
      ? 1
      : step === "date"
      ? 2
      : step === "time"
      ? 3
      : step === "barber"
      ? 4
      : 5;

  return (
    <section className="border-t border-gold-700/20">
      <div className="max-w-4xl mx-auto px-6 py-12 md:py-16">
        {/* Preferred-barber banner (when arriving from a barber profile) */}
        {preferredBarber && (
          <div className="mb-8 flex flex-wrap items-center justify-center gap-3 text-center bg-gold-400/10 border border-gold-400/40 rounded-sm px-4 py-3">
            <p className="font-sans text-xs tracking-[0.25em] text-gold-200">
              <span className="text-green-300">{t.preferredBanner.bookingWith}</span>{" "}
              <strong className="text-white">{preferredBarber.name.toUpperCase()}</strong>
            </p>
            <button
              type="button"
              onClick={() => router.replace("/book")}
              className="font-sans text-xs tracking-[0.25em] text-white/60 hover:text-gold-200 transition underline-offset-4 hover:underline"
            >
              {t.preferredBanner.change}
            </button>
          </div>
        )}

        {/* Progress bar */}
        <ol className="flex items-center justify-between mb-10 text-[10px] md:text-xs tracking-[0.25em] font-sans">
          {[t.steps.service, t.steps.day, t.steps.time, t.steps.barber, t.steps.info].map((label, i) => {
            const num = i + 1;
            const done = num < stepNum;
            const current = num === stepNum;
            return (
              <li key={label} className="flex-1 flex items-center gap-2">
                <span
                  className={`w-6 h-6 rounded-full flex items-center justify-center font-display text-xs border ${
                    done
                      ? "bg-green-400 border-green-400 text-black"
                      : current
                      ? "border-gold-400 text-gold-200"
                      : "border-gold-700/50 text-white/40"
                  }`}
                >
                  {num}
                </span>
                <span
                  className={`hidden sm:inline ${
                    current
                      ? "text-gold-100"
                      : done
                      ? "text-green-300/80"
                      : "text-white/40"
                  }`}
                >
                  {label}
                </span>
                {i < 4 && (
                  <span
                    className={`flex-1 h-px ${
                      done ? "bg-green-400/60" : "bg-gold-700/30"
                    }`}
                  />
                )}
              </li>
            );
          })}
        </ol>

        {/* ============ STEP 1: SERVICE ============ */}
        {step === "service" && (
          <div>
            <h2 className="font-display text-2xl md:text-3xl text-gold-gradient mb-6 text-center">
              {t.pickService}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {services.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => pickService(s.id)}
                  className="text-left bg-bg-card border border-gold-700/30 rounded-sm p-6 hover:border-gold-400/60 transition"
                >
                  <div className="flex items-start justify-between gap-4 mb-2">
                    <h3 className="font-display text-xl text-gold-100">
                      {serviceName(s, serviceCatalog)}
                    </h3>
                    <span className="font-display text-xl text-gold-gradient shrink-0">
                      {money(s.priceCents)}
                    </span>
                  </div>
                  <p className="font-sans text-sm text-white/70 mb-3 leading-relaxed">
                    {serviceDesc(s, serviceCatalog)}
                  </p>
                  <p className="font-sans text-xs tracking-[0.25em] text-green-300">
                    {dur(s.durationMin)}
                  </p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ============ STEP 2: DATE ============ */}
        {step === "date" && service && (
          <div>
            <div className="flex items-center justify-between mb-6 gap-4">
              <button
                type="button"
                onClick={back}
                className="font-sans text-xs tracking-[0.25em] text-green-300 hover:text-gold-200 transition"
              >
                {t.backLink}
              </button>
              <p className="font-sans text-xs tracking-[0.25em] text-white/60">
                {serviceName(service, serviceCatalog)} · {dur(service.durationMin)}
              </p>
            </div>
            <h2 className="font-display text-2xl md:text-3xl text-gold-gradient mb-6 text-center">
              {t.pickDay}
            </h2>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
              {candidateDates.map((d) => {
                const [y, m, dd] = d.split("-").map(Number);
                const dt = new Date(y, m - 1, dd);
                const isToday = formatLocalDate(new Date()) === d;
                return (
                  <button
                    key={d}
                    type="button"
                    onClick={() => pickDate(d)}
                    className="bg-bg-card border border-gold-700/30 rounded-sm p-3 text-center hover:border-gold-400/60 transition"
                  >
                    <p className="font-sans text-[10px] tracking-[0.25em] text-green-300 mb-1">
                      {dt
                        .toLocaleDateString([], { weekday: "short" })
                        .toUpperCase()}
                    </p>
                    <p className="font-display text-2xl text-gold-100 leading-none">
                      {dt.getDate()}
                    </p>
                    <p className="font-sans text-[10px] text-white/50 mt-1">
                      {dt.toLocaleDateString([], { month: "short" })}
                      {isToday ? ` · ${t.today}` : ""}
                    </p>
                  </button>
                );
              })}
            </div>
            {candidateDates.length === 0 && (
              <p className="text-center font-sans text-sm text-white/60">
                No availability in the next 30 days. Please call the shop.
              </p>
            )}
          </div>
        )}

        {/* ============ STEP 3: TIME ============ */}
        {step === "time" && service && dateStr && (
          <div>
            <div className="flex items-center justify-between mb-6 gap-4">
              <button
                type="button"
                onClick={back}
                className="font-sans text-xs tracking-[0.25em] text-green-300 hover:text-gold-200 transition"
              >
                {t.backLink}
              </button>
              <p className="font-sans text-xs tracking-[0.25em] text-white/60">
                {fmtDay(dateStr)}
              </p>
            </div>
            <h2 className="font-display text-2xl md:text-3xl text-gold-gradient mb-6 text-center">
              {t.pickTime}
            </h2>
            {slotsLoading ? (
              <p className="text-center font-sans text-sm text-white/60">
                {t.loading}
              </p>
            ) : slots.length === 0 ? (
              <p className="text-center font-sans text-sm text-white/60">
                {preferredBarber
                  ? `${preferredBarber.name} ${t.noSlotsForBarberA}`
                  : t.noSlots}
              </p>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
                {slots.map((s) => (
                  <button
                    key={s.startAt}
                    type="button"
                    onClick={() => pickSlot(s)}
                    className="bg-bg-card border border-gold-700/30 rounded-sm py-3 text-center hover:border-gold-400/60 transition font-sans text-sm text-gold-100"
                  >
                    {fmtSlotTime(s.startAt)}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ============ STEP 4: BARBER ============ */}
        {step === "barber" && service && slot && (
          <div>
            <div className="flex items-center justify-between mb-6 gap-4">
              <button
                type="button"
                onClick={back}
                className="font-sans text-xs tracking-[0.25em] text-green-300 hover:text-gold-200 transition"
              >
                {t.backLink}
              </button>
              <p className="font-sans text-xs tracking-[0.25em] text-white/60">
                {fmtDay(dateStr!)} · {fmtSlotTime(slot.startAt)}
              </p>
            </div>
            <h2 className="font-display text-2xl md:text-3xl text-gold-gradient mb-6 text-center">
              {t.pickBarber}
            </h2>
            {preferredUnavailable && preferredBarber && (
              <div className="mb-6 text-center bg-pole-red/10 border border-pole-red/40 rounded-sm px-4 py-3">
                <p className="font-sans text-sm text-white/90">
                  <strong className="text-pole-red">
                    {preferredBarber.name}
                  </strong>{" "}
                  {t.preferredUnavailableA} {fmtSlotTime(slot.startAt)}
                  {t.preferredUnavailableB}{" "}
                  <button
                    type="button"
                    onClick={() => setStep("time")}
                    className="text-gold-200 hover:text-gold-100 underline underline-offset-4"
                  >
                    {t.preferredUnavailableBack}
                  </button>{" "}
                  {t.preferredUnavailableC}
                </p>
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => pickBarber(ANY_BARBER)}
                className="bg-bg-card border border-gold-700/30 rounded-sm p-6 text-center hover:border-gold-400/60 transition"
              >
                <p className="font-display text-2xl text-gold-gradient mb-1">
                  {t.anyoneAvailable}
                </p>
                <p className="font-sans text-xs tracking-[0.25em] text-green-300 mb-2">
                  {t.fastestOption}
                </p>
                <p className="font-sans text-sm text-white/70">
                  {t.anyoneDesc}
                </p>
              </button>
              {barbers
                .filter((b) => slot.availableBarberIds.includes(b.id))
                .map((b) => (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => pickBarber(b.id)}
                    className="bg-bg-card border border-gold-700/30 rounded-sm p-6 text-center hover:border-gold-400/60 transition"
                  >
                    <p className="font-display text-2xl text-gold-gradient mb-1">
                      {b.name}
                    </p>
                    <p className="font-sans text-xs tracking-[0.25em] text-green-300">
                      {b.role.toUpperCase()}
                    </p>
                  </button>
                ))}
            </div>
            {slot.availableBarberIds.length === 0 && (
              <p className="text-center font-sans text-sm text-white/60 mt-4">
                {t.noBarbersAtTime}
              </p>
            )}
          </div>
        )}

        {/* ============ STEP 5: INFO ============ */}
        {step === "info" && service && slot && barberChoice && (
          <div>
            <div className="flex items-center justify-between mb-6 gap-4">
              <button
                type="button"
                onClick={back}
                className="font-sans text-xs tracking-[0.25em] text-green-300 hover:text-gold-200 transition"
              >
                {t.backLink}
              </button>
              <p className="font-sans text-xs tracking-[0.25em] text-white/60 text-right">
                {serviceName(service, serviceCatalog)} · {fmtDay(dateStr!)} · {fmtSlotTime(slot.startAt)}
                <br />
                {barberChoice === ANY_BARBER
                  ? t.anyoneAvailable
                  : barbers.find((b) => b.id === barberChoice)?.name}
              </p>
            </div>
            <h2 className="font-display text-2xl md:text-3xl text-gold-gradient mb-6 text-center">
              {t.yourInfo}
            </h2>
            <form onSubmit={submit} className="space-y-4 max-w-md mx-auto">
              <Field
                label={t.form.fullName}
                value={info.name}
                onChange={(v) => setInfo({ ...info, name: v })}
                required
              />
              <Field
                label={t.form.email}
                type="email"
                value={info.email}
                onChange={(v) => setInfo({ ...info, email: v })}
                required
              />
              <Field
                label={t.form.phone}
                type="tel"
                value={info.phone}
                onChange={(v) => setInfo({ ...info, phone: v })}
                required
              />
              <Field
                label={t.form.notes}
                value={info.notes}
                onChange={(v) => setInfo({ ...info, notes: v })}
                textarea
              />
              {submitError && (
                <p className="font-sans text-sm text-pole-red bg-pole-red/10 border border-pole-red/40 rounded-sm px-4 py-3">
                  {submitError}
                </p>
              )}
              <button
                type="submit"
                disabled={isPending}
                className="w-full inline-flex items-center justify-center px-8 py-4 text-sm tracking-[0.3em] font-semibold bg-gradient-to-b from-gold-100 to-gold-600 text-black rounded-sm hover:brightness-110 transition shadow-[0_0_30px_rgba(212,175,55,0.35)] disabled:opacity-60"
              >
                {isPending ? t.form.reserving : t.form.reserve}
              </button>
              <p className="font-sans text-xs text-white/50 text-center">
                {t.form.confirmEmailNote}
              </p>
            </form>
          </div>
        )}
      </div>
    </section>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  required = false,
  textarea = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
  textarea?: boolean;
}) {
  return (
    <label className="block">
      <span className="font-sans text-xs tracking-[0.25em] text-green-300 block mb-2">
        {label.toUpperCase()}
        {required ? " *" : ""}
      </span>
      {textarea ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={3}
          className="w-full bg-bg-card border border-gold-700/40 rounded-sm px-4 py-3 font-sans text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-green-400 transition"
        />
      ) : (
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required={required}
          className="w-full bg-bg-card border border-gold-700/40 rounded-sm px-4 py-3 font-sans text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-green-400 transition"
        />
      )}
    </label>
  );
}
