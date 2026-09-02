export type Barber = {
  slug: string;
  name: string;
  role: string;
  tagline: string;
  bio: string;
  yearsExperience: number;
  specialties: string[];
  /** Optional path to /public photo. Falls back to initial-based card if missing. */
  photo?: string;
  /** Brief working schedule shown on profile until real booking data is wired up. */
  schedule: { day: string; hours: string }[];
};

export const barbers: Barber[] = [
  {
    slug: "j",
    name: "J",
    role: "Owner • Master Barber",
    tagline: "Specialist in classic cuts and straight-razor shaves.",
    bio:
      "J founded J's Finest in 2026 after two decades behind the chair. Known for his quiet precision, a perfectly snapped cape, and the kind of hot-towel finish that makes you fall asleep mid-shave. If you want a classic cut done right — every line, every detail — book with J.",
    yearsExperience: 20,
    specialties: [
      "Classic Tapered Cuts",
      "Straight-Razor Shaves",
      "Beard Sculpting",
      "Hot Towel Service",
    ],
    schedule: [
      { day: "Tue – Fri", hours: "9:00 AM – 8:00 PM" },
      { day: "Sat", hours: "8:00 AM – 6:00 PM" },
      { day: "Sun", hours: "10:00 AM – 4:00 PM" },
    ],
  },
  {
    slug: "marco",
    name: "Marco",
    role: "Master Barber Associate",
    tagline: "Fades, tapers, and modern men's styling.",
    bio:
      "Marco brings ten years of fade game to the chair. He's the guy you book when you want a skin fade so clean it looks airbrushed. Heavy into modern men's cuts, designs, and detail work — and he'll spend the time to get your line up exact.",
    yearsExperience: 10,
    specialties: [
      "Skin Fades",
      "Burst Fades",
      "Modern Styling",
      "Hair Designs",
    ],
    schedule: [
      { day: "Tue – Fri", hours: "11:00 AM – 8:00 PM" },
      { day: "Sat", hours: "8:00 AM – 6:00 PM" },
    ],
  },
  {
    slug: "andre",
    name: "Andre",
    role: "Master Barber Associate",
    tagline: "Beard sculpting and detail work.",
    bio:
      "Andre is the detail specialist — beard shaping, mustache work, intricate line work. Six years in and growing fast. If your beard needs a real shape (not just a trim), Andre is the call.",
    yearsExperience: 6,
    specialties: [
      "Beard Sculpting",
      "Mustache Detailing",
      "Lineups",
      "Kid's Cuts",
    ],
    schedule: [
      { day: "Wed – Fri", hours: "12:00 PM – 8:00 PM" },
      { day: "Sat", hours: "9:00 AM – 6:00 PM" },
      { day: "Sun", hours: "10:00 AM – 4:00 PM" },
    ],
  },
];

export function getBarberBySlug(slug: string): Barber | undefined {
  return barbers.find((b) => b.slug === slug);
}
