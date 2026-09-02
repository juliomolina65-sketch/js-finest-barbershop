-- Separates "can log in" from "is bookable". Until now isActive did both, so
-- an owner who only administrates had no way to stay off the public team page
-- without losing access to their own dashboard.
ALTER TABLE "Barber" ADD COLUMN "takesAppointments" BOOLEAN NOT NULL DEFAULT true;

-- The shop owner administrates rather than cutting, so hide them by default.
-- Anyone can flip this back on from Edit Profile.
UPDATE "Barber" SET "takesAppointments" = false WHERE "isOwner" = 1;
