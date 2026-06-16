import type {
  CalendarMonth,
  ChineseCard,
  ChineseCharacterTonePart,
  DayRule,
  MajorEvent,
  MandarinTone,
  NextEvent,
  PinyinTonePart,
  TimelineEvent,
  TimerState,
  ToneColorScheme,
  Weekday
} from "@/lib/types";

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

const toneMarks: Record<MandarinTone, string> = {
  1: "āēīōūǖĀĒĪŌŪǕ",
  2: "áéíóúǘÁÉÍÓÚǗ",
  3: "ǎěǐǒǔǚǍĚǏǑǓǙ",
  4: "àèìòùǜÀÈÌÒÙǛ",
  5: ""
};

const toneColorSchemes: Record<MandarinTone, ToneColorScheme> = {
  1: { light: "#8be9fd", night: "#8be9fd" },
  2: { light: "#50fa7b", night: "#50fa7b" },
  3: { light: "#ffb86c", night: "#ffb86c" },
  4: { light: "#ff5555", night: "#ff5555" },
  5: { light: "#bd93f9", night: "#bd93f9" }
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

export function getUpcomingEventList(
  events: TimelineEvent[] | undefined,
  currentMinutes: number,
  currentDay?: Weekday,
  limit = 6
) {
  const todaysEvents = getEventsForDay(events, currentDay);
  const upcomingEvents = todaysEvents.filter((event) => timeToMinutes(event.time) >= currentMinutes);
  const visibleEvents = upcomingEvents.slice(0, limit);

  return {
    events: visibleEvents,
    hasHiddenPassedEvents: todaysEvents.length > upcomingEvents.length,
    hasHiddenFutureEvents: upcomingEvents.length > visibleEvents.length
  };
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

export function getTimerRemainingMs(timer: TimerState, nowMs: number): number {
  return Math.max(0, timer.durationMs - (nowMs - timer.startedAtMs));
}

export function getTimerProgressRatio(timer: TimerState, nowMs: number): number {
  if (timer.durationMs <= 0) {
    return 1;
  }

  const elapsedMs = timer.durationMs - getTimerRemainingMs(timer, nowMs);
  return Math.min(1, Math.max(0, elapsedMs / timer.durationMs));
}

export function formatTimerRemaining(remainingMs: number): string {
  const safeRemainingSeconds = Math.max(0, Math.ceil(remainingMs / 1000));
  const minutes = Math.floor(safeRemainingSeconds / 60);
  const seconds = safeRemainingSeconds % 60;

  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function shouldShowNextEventCountdown(nextEvent: NextEvent | null): boolean {
  return nextEvent !== null && nextEvent.dayOffset === 0 && nextEvent.minutesUntil <= 60;
}

export function isDarkThemeTime(currentMinutes: number): boolean {
  return currentMinutes >= timeToMinutes("20:00") || currentMinutes < timeToMinutes("08:00");
}

export function getCardForTime(
  cards: ChineseCard[] | undefined,
  currentMinutes: number,
  manualOffset = 0
): ChineseCard | null {
  if (!cards || cards.length === 0) {
    return null;
  }

  const index = (Math.floor(currentMinutes / 2) + manualOffset) % cards.length;
  return cards[index];
}

function hashSeed(seed: string): number {
  let hash = 2_166_136_261;

  for (const character of seed) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16_777_619);
  }

  return hash >>> 0;
}

function seededRandom(seed: number): () => number {
  let state = seed || 1;

  return () => {
    state = Math.imul(state ^ (state >>> 15), 1 | state);
    state ^= state + Math.imul(state ^ (state >>> 7), 61 | state);
    return ((state ^ (state >>> 14)) >>> 0) / 4_294_967_296;
  };
}

export function getShuffledChineseCards(
  cards: ChineseCard[] | undefined,
  seed: string
): ChineseCard[] {
  const shuffled = [...(cards ?? [])];
  const random = seededRandom(hashSeed(seed));

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }

  return shuffled;
}

export function getNextChineseCardIndex(currentIndex: number, cardCount: number): number {
  if (cardCount <= 0) {
    return 0;
  }

  return (currentIndex + 1) % cardCount;
}

export function pinyinToTone(pinyin: string): MandarinTone {
  for (const tone of [1, 2, 3, 4] as const) {
    if ([...pinyin].some((character) => toneMarks[tone].includes(character))) {
      return tone;
    }
  }

  return 5;
}

export function getChineseCharacterToneParts(card: ChineseCard): ChineseCharacterTonePart[] {
  const characters = [...card.hanzi];
  const syllables = card.pinyin.trim().split(/\s+/).filter(Boolean);

  return characters.map((character, index) => ({
    character,
    tone: pinyinToTone(syllables[Math.min(index, syllables.length - 1)] ?? card.pinyin)
  }));
}

export function getPinyinToneParts(card: ChineseCard): PinyinTonePart[] {
  return card.pinyin
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((syllable) => ({
      syllable,
      tone: pinyinToTone(syllable)
    }));
}

export function getToneColorScheme(tone: MandarinTone): ToneColorScheme {
  return toneColorSchemes[tone];
}

function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function utcDateFromIso(date: string): Date {
  return new Date(`${date}T00:00:00Z`);
}

export function getNextMajorEvent(
  majorEvents: MajorEvent[] | undefined,
  today: Date
): MajorEvent | null {
  const todayIso = toIsoDate(today);

  return (
    [...(majorEvents ?? [])]
      .filter((event) => event.date >= todayIso)
      .sort((a, b) => a.date.localeCompare(b.date))[0] ?? null
  );
}

export function majorEventDaysUntil(event: MajorEvent, today: Date): number {
  const start = utcDateFromIso(toIsoDate(today));
  const end = utcDateFromIso(event.date);

  return Math.round((end.getTime() - start.getTime()) / 86_400_000);
}

export function getCalendarMonth(
  date: Date,
  majorEvents: MajorEvent[] | undefined = []
): CalendarMonth {
  const mondayFirstOffset = (date.getUTCDay() + 6) % 7;
  const start = utcDateFromIso(toIsoDate(date));
  start.setUTCDate(start.getUTCDate() - mondayFirstOffset);
  const end = new Date(start);
  end.setUTCDate(start.getUTCDate() + 41);
  const todayIso = toIsoDate(date);
  const eventsByDate = new Map<string, MajorEvent[]>();

  for (const event of majorEvents) {
    eventsByDate.set(event.date, [...(eventsByDate.get(event.date) ?? []), event]);
  }

  const cells = Array.from({ length: 42 }, (_, index) => {
    const cellDate = new Date(start);
    cellDate.setUTCDate(start.getUTCDate() + index);
    const isoDate = toIsoDate(cellDate);

    return {
      date: isoDate,
      day: cellDate.getUTCDate(),
      isCurrentMonth: true,
      isToday: isoDate === todayIso,
      majorEvents: eventsByDate.get(isoDate) ?? []
    };
  });

  return {
    label: `${new Intl.DateTimeFormat("uk-UA", {
      day: "numeric",
      month: "long",
      timeZone: "UTC"
    }).format(start)} - ${new Intl.DateTimeFormat("uk-UA", {
      day: "numeric",
      month: "long",
      timeZone: "UTC"
    }).format(end)}`,
    cells
  };
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
