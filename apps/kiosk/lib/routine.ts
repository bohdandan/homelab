import type { ChineseCard, DayRule, NextEvent, TimelineEvent, Weekday } from "@/lib/types";

const weekdays: Weekday[] = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday"
];

const weekdayLabels: Record<string, Weekday> = {
  sunday: "sunday",
  monday: "monday",
  tuesday: "tuesday",
  wednesday: "wednesday",
  thursday: "thursday",
  friday: "friday",
  saturday: "saturday"
};

function appliesToDay(item: { days?: Weekday[] }, day?: Weekday): boolean {
  return !item.days || !day || item.days.includes(day);
}

export function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);

  if (
    !Number.isInteger(hours) ||
    !Number.isInteger(minutes) ||
    hours < 0 ||
    hours > 23 ||
    minutes < 0 ||
    minutes > 59
  ) {
    throw new Error(`Invalid time: ${time}`);
  }

  return hours * 60 + minutes;
}

export function getCurrentRule(
  rules: DayRule[],
  currentMinutes: number,
  currentDay?: Weekday
): DayRule | null {
  return (
    rules.find((rule) => {
      if (!appliesToDay(rule, currentDay)) {
        return false;
      }

      const from = timeToMinutes(rule.from);
      const to = timeToMinutes(rule.to);

      if (from === to) {
        return true;
      }

      if (from < to) {
        return currentMinutes >= from && currentMinutes < to;
      }

      return currentMinutes >= from || currentMinutes < to;
    }) ?? null
  );
}

export function getNextEvent(
  events: TimelineEvent[] | undefined,
  currentMinutes: number,
  currentDay?: Weekday,
  nextDay?: Weekday
): NextEvent | null {
  const sortedEvents = [...(events ?? [])]
    .filter((event) => appliesToDay(event, currentDay))
    .sort(
    (a, b) => timeToMinutes(a.time) - timeToMinutes(b.time)
  );

  if (sortedEvents.length === 0) {
    return null;
  }

  const today = sortedEvents.find(
    (event) => timeToMinutes(event.time) >= currentMinutes
  );

  if (today) {
    return {
      event: today,
      dayOffset: 0,
      minutesUntil: timeToMinutes(today.time) - currentMinutes
    };
  }

  const tomorrowEvents = [...(events ?? [])]
    .filter((event) => appliesToDay(event, nextDay ?? currentDay))
    .sort((a, b) => timeToMinutes(a.time) - timeToMinutes(b.time));

  const firstTomorrow = tomorrowEvents[0];

  if (!firstTomorrow) {
    return null;
  }

  return {
    event: firstTomorrow,
    dayOffset: 1,
    minutesUntil: 24 * 60 - currentMinutes + timeToMinutes(firstTomorrow.time)
  };
}

export function getEventsForDay(
  events: TimelineEvent[] | undefined,
  currentDay?: Weekday
): TimelineEvent[] {
  return [...(events ?? [])]
    .filter((event) => appliesToDay(event, currentDay))
    .sort((a, b) => timeToMinutes(a.time) - timeToMinutes(b.time));
}

export function getNextWeekday(day: Weekday): Weekday {
  const index = weekdays.indexOf(day);
  return weekdays[(index + 1) % weekdays.length];
}

export function minutesUntilEvent(minutes: number): string {
  if (minutes < 60) {
    return `через ${minutes} хв`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (remainingMinutes === 0) {
    return `через ${hours} год`;
  }

  return `через ${hours} год ${remainingMinutes} хв`;
}

export function shouldShowNextEventCountdown(nextEvent: NextEvent | null): boolean {
  return nextEvent !== null && nextEvent.dayOffset === 0 && nextEvent.minutesUntil <= 60;
}

export function getCardForTime(
  cards: ChineseCard[] | undefined,
  currentMinutes: number
): ChineseCard | null {
  if (!cards || cards.length === 0) {
    return null;
  }

  const index = Math.floor(currentMinutes / 5) % cards.length;
  return cards[index];
}

export function getZonedMinutes(date: Date, timezone: string): number {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: timezone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23"
  }).formatToParts(date);

  const hour = parts.find((part) => part.type === "hour")?.value ?? "00";
  const minute = parts.find((part) => part.type === "minute")?.value ?? "00";

  return Number(hour) * 60 + Number(minute);
}

export function getZonedDay(date: Date, timezone: string): Weekday {
  const day = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    weekday: "long"
  }).format(date).toLowerCase();

  return weekdayLabels[day] ?? "monday";
}

export function formatZonedTime(date: Date, timezone: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: timezone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23"
  }).format(date);
}
