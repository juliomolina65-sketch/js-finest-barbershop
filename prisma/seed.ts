import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * Weekly schedule format:
 *   dayOfWeek: 0 = Sunday ... 6 = Saturday
 *   open/close: "HH:MM" 24-hour strings, or null when closed that day
 */
const standardSchedule = [
  { dayOfWeek: 0, open: "10:00", close: "16:00" }, // Sun
  { dayOfWeek: 1, open: null, close: null }, // Mon - closed
  { dayOfWeek: 2, open: "09:00", close: "20:00" }, // Tue
  { dayOfWeek: 3, open: "09:00", close: "20:00" }, // Wed
  { dayOfWeek: 4, open: "09:00", close: "20:00" }, // Thu
  { dayOfWeek: 5, open: "09:00", close: "20:00" }, // Fri
  { dayOfWeek: 6, open: "08:00", close: "18:00" }, // Sat
];

const marcoSchedule = [
  { dayOfWeek: 0, open: null, close: null },
  { dayOfWeek: 1, open: null, close: null },
  { dayOfWeek: 2, open: "11:00", close: "20:00" },
  { dayOfWeek: 3, open: "11:00", close: "20:00" },
  { dayOfWeek: 4, open: "11:00", close: "20:00" },
  { dayOfWeek: 5, open: "11:00", close: "20:00" },
  { dayOfWeek: 6, open: "08:00", close: "18:00" },
];

const andreSchedule = [
  { dayOfWeek: 0, open: "10:00", close: "16:00" },
  { dayOfWeek: 1, open: null, close: null },
  { dayOfWeek: 2, open: null, close: null },
  { dayOfWeek: 3, open: "12:00", close: "20:00" },
  { dayOfWeek: 4, open: "12:00", close: "20:00" },
  { dayOfWeek: 5, open: "12:00", close: "20:00" },
  { dayOfWeek: 6, open: "09:00", close: "18:00" },
];

async function main() {
  // ============ SERVICES ============
  const services = [
    {
      slug: "classic-cut",
      name: "Classic Cut",
      priceCents: 3000,
      durationMin: 30,
      description:
        "Precision haircut tailored to your style. Hot towel finish included.",
      sortOrder: 1,
    },
    {
      slug: "skin-fade",
      name: "Skin Fade",
      priceCents: 3500,
      durationMin: 45,
      description:
        "Razor-sharp fade — from skin to a clean blend, finished to perfection.",
      sortOrder: 2,
    },
    {
      slug: "beard-trim",
      name: "Beard Trim & Lineup",
      priceCents: 2000,
      durationMin: 20,
      description:
        "Detailed beard sculpting with crisp lines, hot towel, and beard oil.",
      sortOrder: 3,
    },
    {
      slug: "hot-towel-shave",
      name: "Hot Towel Shave",
      priceCents: 3500,
      durationMin: 45,
      description:
        "The classic straight-razor experience — hot towels, oil, and a smooth finish.",
      sortOrder: 4,
    },
    {
      slug: "kids-cut",
      name: "Kid's Cut (12 & under)",
      priceCents: 2200,
      durationMin: 30,
      description:
        "Patient, careful cuts for the next generation. Lollipop included.",
      sortOrder: 5,
    },
    {
      slug: "finest-package",
      name: "The Finest Package",
      priceCents: 6000,
      durationMin: 75,
      description:
        "Cut + beard + hot towel shave. The full experience — head to chin.",
      sortOrder: 6,
    },
  ];

  for (const s of services) {
    await prisma.service.upsert({
      where: { slug: s.slug },
      update: s,
      create: s,
    });
  }
  console.log(`Seeded ${services.length} services`);

  // ============ BARBERS ============
  const barbers = [
    {
      slug: "j",
      name: "J",
      role: "Owner • Master Barber",
      // The shop owner's real login. On a fresh database this row is created
      // WITHOUT a password — sign up at /signup with this email to set one and
      // claim owner access.
      email: "juliomolina65@gmail.com",
      phone: null,
      bio:
        "J founded J's Finest in 2026 after two decades behind the chair. Known for his quiet precision, a perfectly snapped cape, and the kind of hot-towel finish that makes you fall asleep mid-shave. If you want a classic cut done right — every line, every detail — book with J.",
      yearsExperience: 20,
      weeklySchedule: JSON.stringify(standardSchedule),
      specialties: JSON.stringify([
        "Classic Tapered Cuts",
        "Straight-Razor Shaves",
        "Beard Sculpting",
        "Hot Towel Service",
      ]),
      isOwner: true,
    },
    {
      slug: "marco",
      name: "Marco",
      role: "Master Barber Associate",
      email: "marco@jsfinest.com",
      phone: null,
      bio:
        "Marco brings ten years of fade game to the chair. He's the guy you book when you want a skin fade so clean it looks airbrushed. Heavy into modern men's cuts, designs, and detail work — and he'll spend the time to get your line up exact.",
      yearsExperience: 10,
      weeklySchedule: JSON.stringify(marcoSchedule),
      specialties: JSON.stringify([
        "Skin Fades",
        "Burst Fades",
        "Modern Styling",
        "Hair Designs",
      ]),
      isOwner: false,
    },
    {
      slug: "andre",
      name: "Andre",
      role: "Master Barber Associate",
      email: "andre@jsfinest.com",
      phone: null,
      bio:
        "Andre is the detail specialist — beard shaping, mustache work, intricate line work. Six years in and growing fast. If your beard needs a real shape (not just a trim), Andre is the call.",
      yearsExperience: 6,
      weeklySchedule: JSON.stringify(andreSchedule),
      specialties: JSON.stringify([
        "Beard Sculpting",
        "Mustache Detailing",
        "Lineups",
        "Kid's Cuts",
      ]),
      isOwner: false,
    },
  ];

  for (const b of barbers) {
    await prisma.barber.upsert({
      where: { slug: b.slug },
      update: b,
      create: b,
    });
  }
  console.log(`Seeded ${barbers.length} barbers`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
