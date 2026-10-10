import { assertEquals } from "@std/assert";
import dayjs from "dayjs";
import {
  addDays,
  addMonths,
  formatMonthDay,
  formatMonthYear,
  timeUntil,
} from "./dates.ts";

// Each helper must match the dayjs call it replaces in browser code.

Deno.test("formatMonthDay and formatMonthYear match dayjs", () => {
  for (const iso of ["2026-01-05T08:00:00", "2026-12-31T23:59:59"]) {
    const date = new Date(iso);
    assertEquals(formatMonthDay(date), dayjs(date).format("MM/DD"));
    assertEquals(formatMonthYear(date), dayjs(date).format("MM/YY"));
  }
});

Deno.test("addDays matches dayjs add/subtract across month and year ends", () => {
  const date = new Date("2026-03-01T10:30:00");
  for (const days of [-1, -5, -30, -365, 5, 31]) {
    assertEquals(
      addDays(date, days).getTime(),
      dayjs(date).add(days, "day").valueOf(),
      `${days} days`,
    );
  }
});

Deno.test("addMonths clamps to the month's end like dayjs", () => {
  for (
    const iso of [
      "2026-03-31T10:00:00",
      "2024-03-31T10:00:00",
      "2026-01-31T10:00:00",
      "2026-10-10T12:00:00",
    ]
  ) {
    const date = new Date(iso);
    for (const months of [-1, -2, -11, 1, 12]) {
      assertEquals(
        addMonths(date, months).getTime(),
        dayjs(date).add(months, "month").valueOf(),
        `${iso} ${months} months`,
      );
    }
  }
});

Deno.test("timeUntil truncates like dayjs diff", () => {
  const now = new Date("2026-10-10T12:00:00Z");
  const until = new Date("2026-10-11T13:29:59.900Z");
  assertEquals(timeUntil(until, now), {
    hours: dayjs(until).diff(dayjs(now), "hours"),
    minutes: dayjs(until).diff(dayjs(now), "minutes") % 60,
    seconds: dayjs(until).diff(dayjs(now), "seconds") % 60,
  });
  assertEquals(timeUntil(until, now), { hours: 25, minutes: 29, seconds: 59 });
});
