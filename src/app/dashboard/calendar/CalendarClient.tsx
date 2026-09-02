"use client";

import DaySlotGrid, {
  type DaySlotApptLite,
  type DaySlotServiceLite,
} from "../DaySlotGrid";
import type { Dict } from "@/lib/i18n";

type Props = {
  barberId: string;
  dateStr: string;
  isToday: boolean;
  schedule: { open: string; close: string } | null;
  appointments: DaySlotApptLite[];
  services: DaySlotServiceLite[];
  t: Dict["dashboard"]["slot"];
};

export default function CalendarClient({
  dateStr,
  isToday,
  schedule,
  appointments,
  services,
  t,
}: Props) {
  return (
    <DaySlotGrid
      dateStr={dateStr}
      isToday={isToday}
      schedule={schedule}
      appointments={appointments}
      services={services}
      t={t}
    />
  );
}
