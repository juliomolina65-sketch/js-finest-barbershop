-- Some services are priced as a range because the price depends on the barber.
ALTER TABLE "Service" ADD COLUMN "maxPriceCents" INTEGER;

-- Owner's prices (Nov 2026): Classic Cut, Skin Fade and Kid's Cut are $35-$45
-- depending on the barber.
UPDATE "Service" SET "priceCents" = 3500, "maxPriceCents" = 4500 WHERE "slug" IN ('classic-cut', 'skin-fade', 'kids-cut');

-- The Finest Package is no longer offered. Hidden rather than deleted so past
-- appointments keep their service.
UPDATE "Service" SET "isActive" = false WHERE "slug" = 'finest-package';
