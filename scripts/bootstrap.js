/**
 * First-run bootstrap, executed on every container start (see package.json
 * "start"). It is deliberately IDEMPOTENT and NON-DESTRUCTIVE:
 *
 *   • Services are created only when the table is empty.
 *   • The owner barber row is created only when no barbers exist.
 *
 * It never updates existing rows, so edits made in the dashboard (bios,
 * hours, prices) survive redeploys. This exists because a fresh volume
 * starts with an empty database — without it the booking page renders
 * "Pick a service" with nothing to pick.
 *
 * Plain JS on purpose: tsx is a devDependency and may be pruned in the
 * production image, but @prisma/client is a runtime dependency.
 */
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const SERVICES = [
  { slug: "classic-cut", name: "Classic Cut", priceCents: 3000, durationMin: 30, sortOrder: 1,
    description: "Precision haircut tailored to your style. Hot towel finish included." },
  { slug: "skin-fade", name: "Skin Fade", priceCents: 3500, durationMin: 45, sortOrder: 2,
    description: "Razor-sharp fade — from skin to a clean blend, finished to perfection." },
  { slug: "beard-trim", name: "Beard Trim & Lineup", priceCents: 2000, durationMin: 20, sortOrder: 3,
    description: "Detailed beard sculpting with crisp lines, hot towel, and beard oil." },
  { slug: "hot-towel-shave", name: "Hot Towel Shave", priceCents: 3500, durationMin: 45, sortOrder: 4,
    description: "The classic straight-razor experience — hot towels, oil, and a smooth finish." },
  { slug: "kids-cut", name: "Kid's Cut (12 & under)", priceCents: 2200, durationMin: 30, sortOrder: 5,
    description: "Patient, careful cuts for the next generation. Lollipop included." },
  { slug: "finest-package", name: "The Finest Package", priceCents: 6000, durationMin: 75, sortOrder: 6,
    description: "Cut + beard + hot towel shave. The full experience — head to chin." },
];

const OPEN_9_TO_9 = JSON.stringify(
  [0, 1, 2, 3, 4, 5, 6].map((d) => ({ dayOfWeek: d, open: "09:00", close: "21:00" }))
);

async function main() {
  const serviceCount = await prisma.service.count();
  if (serviceCount === 0) {
    for (const s of SERVICES) await prisma.service.create({ data: s });
    console.log(`[bootstrap] created ${SERVICES.length} services`);
  } else {
    console.log(`[bootstrap] ${serviceCount} services already present — skipping`);
  }

  const barberCount = await prisma.barber.count();
  if (barberCount === 0) {
    await prisma.barber.create({
      data: {
        slug: "j",
        name: "J",
        role: "Owner • Master Barber",
        email: "juliomolina65@gmail.com",
        // No passwordHash: the owner claims this row by signing up at /signup
        // with this email, which sets the password and grants owner access.
        bio: "Founder of J's Finest. Two decades behind the chair, known for clean lines and a hot-towel finish.",
        yearsExperience: 20,
        weeklySchedule: OPEN_9_TO_9,
        specialties: JSON.stringify([
          "Classic Tapered Cuts",
          "Straight-Razor Shaves",
          "Beard Sculpting",
          "Hot Towel Service",
        ]),
        isOwner: true,
        isActive: true,
      },
    });
    console.log("[bootstrap] created owner barber (juliomolina65@gmail.com — sign up to set password)");
  } else {
    console.log(`[bootstrap] ${barberCount} barbers already present — skipping`);
  }
}

main()
  .catch((e) => {
    // Never block startup on a bootstrap failure — the site should still boot.
    console.error("[bootstrap] failed:", e.message);
  })
  .finally(() => prisma.$disconnect());
