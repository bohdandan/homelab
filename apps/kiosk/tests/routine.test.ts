import { describe, expect, it } from "vitest";
import dashboardConfig from "@/config/dashboard.json";
import { defaultConfig } from "@/lib/default-config";
import {
  getCardForTime,
  getCalendarMonth,
  getNextChineseCardIndex,
  getCurrentRule,
  getEventsForDay,
  getNextEvent,
  getUpcomingEventList,
  getNextMajorEvent,
  getToneColorScheme,
  getZonedDay,
  majorEventDaysUntil,
  minutesUntilEvent,
  pinyinToTone,
  shouldShowNextEventCountdown,
  timeToMinutes
} from "@/lib/routine";
import type { DashboardConfig } from "@/lib/types";

const config: DashboardConfig = {
  timezone: "Europe/London",
  dayRules: [
    {
      from: "06:30",
      to: "08:30",
      theme: "green",
      label: "MORNING",
      instruction: "Brush teeth and get dressed",
      days: ["monday", "tuesday", "wednesday", "thursday", "friday"]
    },
    {
      from: "08:30",
      to: "15:30",
      theme: "blue",
      label: "SCHOOL TIME",
      instruction: "Have a good day at school"
    },
    {
      from: "20:00",
      to: "06:30",
      theme: "red",
      label: "QUIET TIME",
      instruction: "Quiet time, stay in bed"
    }
  ],
  events: [
    { time: "08:30", title: "School", days: ["monday", "tuesday", "wednesday", "thursday", "friday"] },
    { time: "10:00", title: "Homework", days: ["saturday", "sunday"] },
    { time: "19:30", title: "Reading" },
    { time: "20:00", title: "Bedtime" }
  ],
  chinese: [
    { hanzi: "水", pinyin: "shuǐ", meaning: "water" },
    { hanzi: "月", pinyin: "yuè", meaning: "moon / month" }
  ]
};

describe("routine calculations", () => {
  it("selects a normal daytime rule", () => {
    expect(getCurrentRule(config.dayRules, timeToMinutes("07:42"), "monday")?.label).toBe(
      "MORNING"
    );
  });

  it("skips a weekday-only rule on weekends", () => {
    expect(getCurrentRule(config.dayRules, timeToMinutes("07:42"), "saturday")?.label).not.toBe(
      "MORNING"
    );
  });

  it("selects a rule that crosses midnight before midnight", () => {
    expect(getCurrentRule(config.dayRules, timeToMinutes("20:05"))?.label).toBe(
      "QUIET TIME"
    );
  });

  it("selects a rule that crosses midnight after midnight", () => {
    expect(getCurrentRule(config.dayRules, timeToMinutes("05:55"))?.label).toBe(
      "QUIET TIME"
    );
  });

  it("returns the next event later today", () => {
    expect(getNextEvent(config.events, timeToMinutes("19:00"), "monday")).toEqual({
      event: { time: "19:30", title: "Reading" },
      dayOffset: 0,
      minutesUntil: 30
    });
  });

  it("returns tomorrow's first event after today's events pass", () => {
    expect(getNextEvent(config.events, timeToMinutes("20:10"), "monday", "tuesday")).toEqual({
      event: { time: "08:30", title: "School", days: ["monday", "tuesday", "wednesday", "thursday", "friday"] },
      dayOffset: 1,
      minutesUntil: 740
    });
  });

  it("returns weekend-only homework reminders on weekends", () => {
    expect(getNextEvent(config.events, timeToMinutes("09:00"), "saturday")).toEqual({
      event: { time: "10:00", title: "Homework", days: ["saturday", "sunday"] },
      dayOffset: 0,
      minutesUntil: 60
    });
  });

  it("formats minutes until an event", () => {
    expect(minutesUntilEvent(48)).toBe("через 48 хв");
    expect(minutesUntilEvent(75)).toBe("через 1 год 15 хв");
  });

  it("shows the next-event countdown only for events within the next hour today", () => {
    expect(
      shouldShowNextEventCountdown({
        event: { time: "15:15", title: "Pickup" },
        dayOffset: 0,
        minutesUntil: 59
      })
    ).toBe(true);
    expect(
      shouldShowNextEventCountdown({
        event: { time: "15:15", title: "Pickup" },
        dayOffset: 0,
        minutesUntil: 60
      })
    ).toBe(true);
    expect(
      shouldShowNextEventCountdown({
        event: { time: "15:15", title: "Pickup" },
        dayOffset: 0,
        minutesUntil: 61
      })
    ).toBe(false);
    expect(
      shouldShowNextEventCountdown({
        event: { time: "07:30", title: "Wake up" },
        dayOffset: 1,
        minutesUntil: 30
      })
    ).toBe(false);
  });

  it("returns the weekday for a zoned date", () => {
    expect(getZonedDay(new Date("2026-06-15T12:00:00Z"), "Europe/London")).toBe(
      "monday"
    );
  });

  it("keeps the default kiosk schedule in Ukrainian with weekend homework reminders", () => {
    expect(getCurrentRule(defaultConfig.dayRules, timeToMinutes("18:30"), "monday")?.label).toBe(
      "ВЕЧЕРЯ"
    );
    expect(getCurrentRule(defaultConfig.dayRules, timeToMinutes("19:30"), "monday")?.label).toBe(
      "ДУШ"
    );
    expect(getCurrentRule(defaultConfig.dayRules, timeToMinutes("10:30"), "saturday")?.label).toBe(
      "ЗАВДАННЯ"
    );
    expect(getEventsForDay(defaultConfig.events, "saturday").map((event) => event.title)).toEqual([
      "Китайська Іванки",
      "Домашнє завдання на наступний тиждень",
      "Китайська Міланки",
      "Перевірити домашнє завдання",
      "Час спати"
    ]);
  });

  it("keeps the deployed JSON schedule valid while allowing local schedule edits", () => {
    expect(dashboardConfig.timezone).toBe(defaultConfig.timezone);
    expect(dashboardConfig.events?.length).toBeGreaterThan(0);
  });

  it("includes HSK1 Chinese cards in the default kiosk schedule", () => {
    expect(defaultConfig.chinese?.[0]).toEqual({
      hanzi: "我",
      pinyin: "wǒ",
      meaning: "я"
    });
    expect(defaultConfig.chinese?.some((card) => card.hanzi === "水")).toBe(true);
  });

  it("detects Mandarin tone from marked pinyin", () => {
    expect(pinyinToTone("mā")).toBe(1);
    expect(pinyinToTone("má")).toBe(2);
    expect(pinyinToTone("mǎ")).toBe(3);
    expect(pinyinToTone("mà")).toBe(4);
    expect(pinyinToTone("ma")).toBe(5);
  });

  it("uses the Dracula tone color scheme", () => {
    expect(getToneColorScheme(1)).toEqual({ light: "#8be9fd", night: "#8be9fd" });
    expect(getToneColorScheme(2)).toEqual({ light: "#50fa7b", night: "#50fa7b" });
    expect(getToneColorScheme(3)).toEqual({ light: "#ffb86c", night: "#ffb86c" });
    expect(getToneColorScheme(4)).toEqual({ light: "#ff5555", night: "#ff5555" });
    expect(getToneColorScheme(5)).toEqual({ light: "#bd93f9", night: "#bd93f9" });
  });

  it("includes the school week and activity reminders in the default kiosk schedule", () => {
    expect(getEventsForDay(defaultConfig.events, "monday").map((event) => event.title)).toEqual([
      "Прокидатися",
      "Вихід до школи",
      "Початок уроків",
      "Забрати Іванку зі школи",
      "Забрати Міланку зі школи",
      "Кікбоксинг Іванки і Міланки 16:15-17:00",
      "Вечеря",
      "Душ",
      "Час спати"
    ]);

    expect(getEventsForDay(defaultConfig.events, "tuesday").map((event) => event.title)).toEqual([
      "Прокидатися",
      "Вихід до школи",
      "Початок уроків",
      "Забрати Іванку зі школи",
      "Забрати Міланку зі школи",
      "Китайська Іванки і Міланки 16:00-16:30",
      "Вечеря",
      "Душ",
      "Час спати"
    ]);

    expect(getEventsForDay(defaultConfig.events, "wednesday").map((event) => event.title)).toEqual([
      "Прокидатися",
      "Вихід до школи",
      "Початок уроків",
      "Забрати Іванку зі школи",
      "Забрати Міланку з балету",
      "Вечеря",
      "Душ",
      "Час спати"
    ]);

    expect(getEventsForDay(defaultConfig.events, "thursday").map((event) => event.title)).toEqual([
      "Прокидатися",
      "Вихід до школи",
      "Початок уроків",
      "Забрати Іванку зі школи",
      "Забрати Міланку з шахів",
      "Вечеря",
      "Душ",
      "Час спати"
    ]);

    expect(getEventsForDay(defaultConfig.events, "saturday").map((event) => event.title)).toEqual([
      "Китайська Іванки",
      "Домашнє завдання на наступний тиждень",
      "Китайська Міланки",
      "Перевірити домашнє завдання",
      "Час спати"
    ]);
  });

  it("rotates chinese cards every two minutes", () => {
    expect(getCardForTime(config.chinese, timeToMinutes("07:01"))?.hanzi).toBe(
      "水"
    );
    expect(getCardForTime(config.chinese, timeToMinutes("07:02"))?.hanzi).toBe(
      "月"
    );
  });

  it("wraps the manual Chinese next button through available cards", () => {
    expect(getNextChineseCardIndex(0, 2)).toBe(1);
    expect(getNextChineseCardIndex(1, 2)).toBe(0);
    expect(getNextChineseCardIndex(4, 0)).toBe(0);
  });

  it("handles missing optional lists", () => {
    expect(getNextEvent([], timeToMinutes("12:00"))).toBeNull();
    expect(getCardForTime(undefined, timeToMinutes("12:00"))).toBeNull();
  });

  it("returns only upcoming events and marks hidden passed or truncated events", () => {
    const result = getUpcomingEventList(config.events, timeToMinutes("10:30"), "monday", 2);

    expect(result.events.map((event) => event.title)).toEqual(["Reading", "Bedtime"]);
    expect(result.hasHiddenPassedEvents).toBe(true);
    expect(result.hasHiddenFutureEvents).toBe(false);
  });

  it("marks hidden future events when the visible upcoming list is capped", () => {
    const result = getUpcomingEventList(config.events, timeToMinutes("07:00"), "monday", 2);

    expect(result.events.map((event) => event.title)).toEqual(["School", "Reading"]);
    expect(result.hasHiddenPassedEvents).toBe(false);
    expect(result.hasHiddenFutureEvents).toBe(true);
  });

  it("finds the next major event by exact date", () => {
    const majorEvents = [
      { date: "2026-06-10", title: "Минуле свято", kind: "holiday" as const },
      { date: "2026-07-20", title: "Legoland", kind: "trip" as const }
    ];

    expect(getNextMajorEvent(majorEvents, new Date("2026-06-15T12:00:00Z"))?.title).toBe(
      "Legoland"
    );
    expect(majorEventDaysUntil(majorEvents[1], new Date("2026-06-15T12:00:00Z"))).toBe(35);
  });

  it("builds a calendar month with major event markers", () => {
    const month = getCalendarMonth(
      new Date("2026-06-15T12:00:00Z"),
      [
        { date: "2026-06-20", title: "Подорож", kind: "trip", icon: "🎒" },
        { date: "2026-07-20", title: "Legoland", kind: "trip", icon: "🎢" }
      ]
    );

    expect(month.label).toBe("15 червня - 26 липня");
    expect(month.cells).toHaveLength(42);
    expect(month.cells.at(0)?.date).toBe("2026-06-15");
    expect(month.cells.at(-1)?.date).toBe("2026-07-26");
    expect(month.cells.find((cell) => cell.date === "2026-06-20")?.majorEvents[0]?.icon).toBe("🎒");
    expect(month.cells.find((cell) => cell.date === "2026-07-20")?.majorEvents[0]?.icon).toBe("🎢");
  });
});
