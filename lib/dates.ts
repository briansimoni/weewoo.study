/**
 * Small, dependency-free date helpers for browser code (islands).
 *
 * Islands can't import dayjs: it's CommonJS, and under the Vite dev server the
 * browser receives the raw file ("does not provide an export named 'default'"),
 * which broke the profile chart in `deno task dev`. Server code keeps using
 * dayjs. These follow dayjs's semantics: local time, and month arithmetic
 * clamps to the end of the month (Mar 31 minus one month is Feb 28/29).
 */

const pad = (n: number) => String(n).padStart(2, "0");

/** "MM/DD" in local time, like dayjs's `format("MM/DD")`. */
export function formatMonthDay(date: Date): string {
  return `${pad(date.getMonth() + 1)}/${pad(date.getDate())}`;
}

/** "MM/YY" in local time, like dayjs's `format("MM/YY")`. */
export function formatMonthYear(date: Date): string {
  return `${pad(date.getMonth() + 1)}/${pad(date.getFullYear() % 100)}`;
}

/** `date` plus `days` calendar days (negative to subtract), local time. */
export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

/**
 * `date` plus `months` (negative to subtract), keeping the time of day and
 * clamping the day to the target month's length, as dayjs does.
 */
export function addMonths(date: Date, months: number): Date {
  const result = new Date(date);
  const day = date.getDate();
  result.setDate(1);
  result.setMonth(result.getMonth() + months);
  const daysInMonth = new Date(result.getFullYear(), result.getMonth() + 1, 0)
    .getDate();
  result.setDate(Math.min(day, daysInMonth));
  return result;
}

/** Whole hours, minutes and seconds until `until`, truncated like dayjs `diff`. */
export function timeUntil(until: Date, now = new Date()) {
  const ms = until.getTime() - now.getTime();
  return {
    hours: Math.trunc(ms / 3_600_000),
    minutes: Math.trunc(ms / 60_000) % 60,
    seconds: Math.trunc(ms / 1000) % 60,
  };
}
